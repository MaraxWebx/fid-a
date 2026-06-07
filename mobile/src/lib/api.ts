import type {
  ActivationStatus,
  AppNotification,
  UserBeautyStats,
  Booking,
  BookingDetail,
  BookingInput,
  BookingStatusInput,
  BookingSlot,
  BookingSlotAlternativesResponse,
  BookingUpdateInput,
  BusinessInsightPeriod,
  BusinessInsights,
  Center,
  CenterActivationStatusResponse,
  CenterAssociationInput,
  CenterAssociationResponse,
  CenterAvailabilityInput,
  CenterAvailabilityResponse,
  CenterAuthResponse,
  CenterClient,
  CenterDashboard,
  CenterClientDetail,
  CenterLogoUploadResponse,
  CenterMembershipsResponse,
  CenterOnboardingInput,
  CenterOnboardingResponse,
  CenterProfileInput,
  CenterRegistrationInput,
  CenterRegistrationResponse,
  CenterServiceConfigInput,
  ClientAuthResponse,
  ClientRegistrationInput,
  FavoriteCentersResponse,
  InvitationResolveResponse,
  LoginInput,
  Review,
  ReviewInput,
  Service,
  UserProfileInput,
  UserProfile,
} from '../types/api';
import * as SecureStore from './storage';

const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://fid-a-production.up.railway.app';

const accessTokenKey = 'fidea.accessToken';
const sessionKey = 'fidea.session';

export type StoredSession =
  | { role: 'client'; user: UserProfile }
  | { role: 'center'; center: Center; activation: ActivationStatus };

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export async function saveAuthSession(token: string, session: StoredSession) {
  await SecureStore.setItemAsync(accessTokenKey, token);
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function updateStoredSession(session: StoredSession) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function getStoredAuthSession(): Promise<StoredSession | null> {
  const [token, sessionValue] = await Promise.all([
    SecureStore.getItemAsync(accessTokenKey),
    SecureStore.getItemAsync(sessionKey),
  ]);
  if (!token || !sessionValue) return null;

  try {
    return JSON.parse(sessionValue) as StoredSession;
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(accessTokenKey),
    SecureStore.deleteItemAsync(sessionKey),
  ]);
}

async function getAccessToken() {
  return SecureStore.getItemAsync(accessTokenKey);
}

export class ApiError extends Error {
  code?: string;
  alternatives?: BookingSlot[];

  constructor(message: string, code?: string, alternatives?: BookingSlot[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.alternatives = alternatives;
  }
}

async function parseApiError(response: Response) {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return new ApiError(body.detail);
    if (body?.detail?.message || body?.detail?.code) {
      return new ApiError(
        body.detail.message ?? `Request failed: ${response.status}`,
        body.detail.code,
        body.detail.alternatives,
      );
    }
  } catch {
    // Use generic error below.
  }
  return new ApiError(`Request failed: ${response.status}`);
}

async function buildHeaders(headers: HeadersInit = {}, authenticated = true) {
  const nextHeaders = new Headers(headers);
  if (authenticated) {
    const token = await getAccessToken();
    if (token) nextHeaders.set('Authorization', `Bearer ${token}`);
  }
  return nextHeaders;
}

async function handleUnauthorized(response: Response) {
  if (response.status === 401) {
    await clearAuthSession();
    sessionExpiredHandler?.();
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    await handleUnauthorized(response);
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

async function post<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleUnauthorized(response);
    throw await parseApiError(response);
  }

  return (await response.json()) as TResponse;
}

async function patch<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleUnauthorized(response);
    throw await parseApiError(response);
  }

  return (await response.json()) as TResponse;
}

async function del<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    await handleUnauthorized(response);
    throw await parseApiError(response);
  }

  return (await response.json()) as TResponse;
}

export function getCenters() {
  return request<Center[]>('/api/centers');
}

export function getCenterServices(centerId: string) {
  return request<Service[]>(`/api/centers/${centerId}/services`);
}

export function getCenterBookingSlots(centerId: string, params: { serviceId: string; date: string; bookingId?: string }) {
  const search = new URLSearchParams({
    service_id: params.serviceId,
    date: params.date,
  });
  if (params.bookingId) search.set('booking_id', params.bookingId);
  return request<{ center_id: string; service_id: string; date: string; slots: BookingSlot[]; alternatives?: BookingSlot[]; reason?: string | null }>(
    `/api/centers/${centerId}/booking-slots?${search.toString()}`,
  );
}

async function postForm<TResponse>(path: string, formData: FormData): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: formData,
  });

  if (!response.ok) {
    await handleUnauthorized(response);
    throw await parseApiError(response);
  }

  return (await response.json()) as TResponse;
}

export function getCenterBookingSlotAlternatives(
  centerId: string,
  params: { serviceId: string; date: string; time: string; maxSuggestions?: number },
) {
  const search = new URLSearchParams({
    service_id: params.serviceId,
    date: params.date,
    time: params.time,
    max_suggestions: String(params.maxSuggestions ?? 3),
  });
  return request<BookingSlotAlternativesResponse>(
    `/api/centers/${centerId}/booking-slots/alternatives?${search.toString()}`,
  );
}

export function getCenterReviews(centerId: string) {
  return request<Review[]>(`/api/centers/${centerId}/reviews`);
}

export function getUserProfile(email: string) {
  return request<UserProfile>('/api/users/profile');
}

export function updateUserProfile(email: string, payload: UserProfileInput) {
  return patch<UserProfile, UserProfileInput>('/api/users/profile', payload);
}

export function getUserBookings(email: string) {
  return request<Booking[]>('/api/users/bookings');
}

export function getUserStats(email: string) {
  return request<UserBeautyStats>('/api/users/stats');
}

export function getFavoriteCenters(email: string) {
  return request<FavoriteCentersResponse>('/api/users/favorite-centers');
}

export function getCenterMemberships(email: string) {
  return request<CenterMembershipsResponse>('/api/users/center-memberships');
}

export function resolveInvitation(invitationCode: string) {
  return request<InvitationResolveResponse>(
    `/api/onboarding/invitations/${encodeURIComponent(invitationCode)}`,
  );
}

export function associateClientWithCenter(payload: CenterAssociationInput) {
  return post<CenterAssociationResponse, CenterAssociationInput>(
    '/api/users/center-memberships',
    payload,
  );
}

export function toggleFavoriteCenter(email: string, centerId: string) {
  return patch<FavoriteCentersResponse, Record<string, never>>(
    `/api/users/favorite-centers/${centerId}`,
    {},
  );
}

export function getCenterDashboard(centerId: string) {
  return request<CenterDashboard>(`/api/centers/${centerId}/dashboard`);
}

export function getCenterBusinessInsights(centerId: string, period: BusinessInsightPeriod = 'month') {
  return request<BusinessInsights>(`/api/centers/${centerId}/business-insights?period=${encodeURIComponent(period)}`);
}

export async function getCenterBusinessReportUrl(centerId: string, period: BusinessInsightPeriod = 'month') {
  const search = new URLSearchParams({ period });
  const token = await getAccessToken();
  if (token) search.set('access_token', token);
  return `${baseUrl}/api/centers/${centerId}/business-insights/report.pdf?${search.toString()}`;
}

export async function getCenterNoShowReportUrl(centerId: string, period: BusinessInsightPeriod = 'month') {
  const search = new URLSearchParams({ period });
  const token = await getAccessToken();
  if (token) search.set('access_token', token);
  return `${baseUrl}/api/centers/${centerId}/business-insights/no-show-report.pdf?${search.toString()}`;
}

export function deleteCenterMonthlyNoShowReport(centerId: string, period: BusinessInsightPeriod = 'month') {
  return del<{ deleted: boolean; period: { key: BusinessInsightPeriod; label: string; start: string; end: string } }>(
    `/api/centers/${centerId}/business-insights/no-show-report?period=${encodeURIComponent(period)}`,
  );
}

export function getCenterClients(centerId: string) {
  return request<CenterClient[]>(`/api/centers/${centerId}/clients`);
}

export function getCenterClientDetail(centerId: string, clientId: string) {
  return request<CenterClientDetail>(`/api/centers/${centerId}/clients/${clientId}`);
}

export function getCenterBookings(centerId: string, date?: string) {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  return request<Booking[]>(`/api/centers/${centerId}/bookings${suffix}`);
}

export function getCenterBookingDetail(centerId: string, bookingId: string) {
  return request<BookingDetail>(`/api/centers/${centerId}/bookings/${bookingId}`);
}

export function getCenterUserStats(centerId: string, email: string) {
  const query = encodeURIComponent(email);
  return request<UserBeautyStats>(`/api/centers/${centerId}/user-stats?email=${query}`);
}

export async function registerCenter(payload: CenterRegistrationInput) {
  const response = await post<CenterRegistrationResponse, CenterRegistrationInput>('/api/centers/register', payload);
  await saveAuthSession(response.access_token, {
    role: 'center',
    center: response.center,
    activation: response.activation,
  });
  return response;
}

export function activateCenterSubscription(centerId: string) {
  return post<CenterOnboardingResponse, Record<string, never>>(
    `/api/centers/${centerId}/subscription/activate`,
    {},
  );
}

export function updateCenterOnboarding(centerId: string, payload: CenterOnboardingInput) {
  return patch<CenterOnboardingResponse, CenterOnboardingInput>(
    `/api/centers/${centerId}/onboarding`,
    payload,
  );
}

export function updateCenterProfile(centerId: string, payload: CenterProfileInput) {
  return patch<CenterOnboardingResponse, CenterProfileInput>(
    `/api/centers/${centerId}/profile`,
    payload,
  );
}

export function uploadCenterLogo(
  centerId: string,
  file: { name: string; type: string; uri: string },
) {
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);
  return postForm<CenterLogoUploadResponse>(
    `/api/centers/${centerId}/branding/logo`,
    formData,
  );
}

export function updateCenterAvailability(centerId: string, payload: CenterAvailabilityInput) {
  return patch<CenterAvailabilityResponse, CenterAvailabilityInput>(
    `/api/centers/${centerId}/availability`,
    payload,
  );
}

export function updateCenterServices(centerId: string, payload: CenterServiceConfigInput) {
  return patch<Service[], CenterServiceConfigInput>(
    `/api/centers/${centerId}/services`,
    payload,
  );
}

export async function loginCenter(payload: LoginInput) {
  const response = await post<CenterAuthResponse, LoginInput>('/api/auth/centers/login', payload);
  await saveAuthSession(response.access_token, {
    role: 'center',
    center: response.center,
    activation: response.activation,
  });
  return response;
}

export async function registerClient(payload: ClientRegistrationInput) {
  const response = await post<ClientAuthResponse, ClientRegistrationInput>('/api/auth/clients/register', payload);
  await saveAuthSession(response.access_token, { role: 'client', user: response.user });
  return response;
}

export async function loginClient(payload: LoginInput) {
  const response = await post<ClientAuthResponse, LoginInput>('/api/auth/clients/login', payload);
  await saveAuthSession(response.access_token, { role: 'client', user: response.user });
  return response;
}

export function getCenterActivationStatus(centerId: string) {
  return request<CenterActivationStatusResponse>(`/api/centers/${centerId}/activation-status`);
}

export function getNotifications(params: {
  role: 'client' | 'center';
  email?: string;
  centerId?: string;
}) {
  const search = new URLSearchParams({ role: params.role });
  if (params.centerId) search.set('center_id', params.centerId);
  return request<AppNotification[]>(`/api/notifications?${search.toString()}`);
}

export function markNotificationsRead(notificationIds: string[]) {
  return patch<{ updated: number }, { notification_ids: string[] }>(
    '/api/notifications/read',
    { notification_ids: notificationIds },
  );
}

export function createReview(payload: ReviewInput) {
  return post<Review, ReviewInput>('/api/reviews', payload);
}

export function createBooking(payload: BookingInput) {
  return post<Booking, BookingInput>('/api/bookings', payload);
}

export function updateBooking(bookingId: string, payload: BookingUpdateInput) {
  return patch<Booking, BookingUpdateInput>(`/api/bookings/${bookingId}`, payload);
}

export function updateBookingStatus(bookingId: string, payload: BookingStatusInput) {
  return patch<Booking, BookingStatusInput>(`/api/bookings/${bookingId}/status`, payload);
}

export function cancelBooking(params: { bookingId: string; role: 'client' | 'center'; userEmail?: string; centerId?: string }) {
  const search = new URLSearchParams({ role: params.role });
  if (params.userEmail) search.set('user_email', params.userEmail);
  if (params.centerId) search.set('center_id', params.centerId);
  return patch<Booking, Record<string, never>>(
    `/api/bookings/${params.bookingId}/cancel?${search.toString()}`,
    {},
  );
}
