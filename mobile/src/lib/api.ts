import type {
  Booking,
  Center,
  CenterAuthResponse,
  CenterClient,
  CenterDashboard,
  CenterOnboardingInput,
  CenterOnboardingResponse,
  CenterRegistrationInput,
  CenterRegistrationResponse,
  ClientAuthResponse,
  ClientRegistrationInput,
  LoginInput,
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

export function registerCenter(payload: CenterRegistrationInput) {
  return post<CenterRegistrationResponse, CenterRegistrationInput>('/api/centers/register', payload);
}

export function updateCenterOnboarding(centerId: string, payload: CenterOnboardingInput) {
  return patch<CenterOnboardingResponse, CenterOnboardingInput>(
    `/api/centers/${centerId}/onboarding`,
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
