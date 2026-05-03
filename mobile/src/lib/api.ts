import type {
  AppNotification,
  Booking,
  BookingInput,
  BookingSlot,
  BookingUpdateInput,
  Center,
  CenterActivationStatusResponse,
  CenterAvailabilityInput,
  CenterAvailabilityResponse,
  CenterAuthResponse,
  CenterClient,
  CenterDashboard,
  CenterOnboardingInput,
  CenterOnboardingResponse,
  CenterProfileInput,
  CenterRegistrationInput,
  CenterRegistrationResponse,
  CenterServiceConfigInput,
  ClientAuthResponse,
  ClientRegistrationInput,
  LoginInput,
  Review,
  ReviewInput,
  Service,
  UserProfile,
} from '../types/api';

const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://fid-a-production.up.railway.app';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function post<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

async function patch<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
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
  return request<{ center_id: string; service_id: string; date: string; slots: BookingSlot[] }>(
    `/api/centers/${centerId}/booking-slots?${search.toString()}`,
  );
}

export function getCenterReviews(centerId: string) {
  return request<Review[]>(`/api/centers/${centerId}/reviews`);
}

export function getUserProfile(email: string) {
  const query = encodeURIComponent(email);
  return request<UserProfile>(`/api/users/profile?email=${query}`);
}

export function getUserBookings(email: string) {
  const query = encodeURIComponent(email);
  return request<Booking[]>(`/api/users/bookings?email=${query}`);
}

export function getCenterDashboard(centerId: string) {
  return request<CenterDashboard>(`/api/centers/${centerId}/dashboard`);
}

export function getCenterClients(centerId: string) {
  return request<CenterClient[]>(`/api/centers/${centerId}/clients`);
}

export function getCenterBookings(centerId: string, date?: string) {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  return request<Booking[]>(`/api/centers/${centerId}/bookings${suffix}`);
}

export function registerCenter(payload: CenterRegistrationInput) {
  return post<CenterRegistrationResponse, CenterRegistrationInput>('/api/centers/register', payload);
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

export function loginCenter(payload: LoginInput) {
  return post<CenterAuthResponse, LoginInput>('/api/auth/centers/login', payload);
}

export function registerClient(payload: ClientRegistrationInput) {
  return post<ClientAuthResponse, ClientRegistrationInput>('/api/auth/clients/register', payload);
}

export function loginClient(payload: LoginInput) {
  return post<ClientAuthResponse, LoginInput>('/api/auth/clients/login', payload);
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
  if (params.email) search.set('email', params.email);
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

export function cancelBooking(params: { bookingId: string; role: 'client' | 'center'; userEmail?: string; centerId?: string }) {
  const search = new URLSearchParams({ role: params.role });
  if (params.userEmail) search.set('user_email', params.userEmail);
  if (params.centerId) search.set('center_id', params.centerId);
  return patch<Booking, Record<string, never>>(
    `/api/bookings/${params.bookingId}/cancel?${search.toString()}`,
    {},
  );
}
