import type {
  Booking,
  Center,
  CenterClient,
  CenterDashboard,
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
