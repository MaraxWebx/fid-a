export type Center = {
  id: string;
  email: string;
  name: string;
  branding: {
    logo?: string;
  };
  opening_hours: Record<string, { start: string | null; end: string | null }>;
  opening_days?: string[];
  availability_overrides?: Record<
    string,
    { enabled: boolean; start: string | null; end: string | null; note?: string | null }
  >;
  primary_services?: string[];
  registration_status?: string;
  subscription_status?: string;
  is_listable?: boolean;
  created_at?: string;
};

export type Service = {
  id: string;
  center_id: string;
  name: string;
  category: string;
  subcategory: string;
  duration: number | null;
  price: number | null;
  description?: string;
  visibility?: string;
  created_at?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  center_id: string | null;
  favorite_center_ids?: string[];
  created_at?: string;
};

export type Booking = {
  id: string;
  center_id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  operator_name: string;
  client_name?: string;
  client_phone?: string;
  status: string;
  slot_id?: string;
  start_time?: string;
  end_time?: string;
  date_label: string | null;
  time_label: string | null;
  price: number | null;
  created_at?: string;
};

export type BookingDetail = {
  booking: Booking;
  review: Review | null;
};

export type BookingSlot = {
  id: string;
  start_time: string;
  end_time: string;
  date_label: string;
  time_label: string;
  availability_label: string;
};

export type Review = {
  id: string;
  center_id: string;
  user_id: string;
  booking_id: string;
  service_name?: string;
  rating: number;
  comment: string;
  user_name?: string;
  created_at?: string;
};

export type AppNotification = {
  id: string;
  role: string;
  center_id?: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  created_at?: string;
};

export type BookingInput = {
  center_id: string;
  user_email: string;
  service_id: string;
  slot_id: string;
};

export type BookingUpdateInput = {
  role: 'client' | 'center';
  user_email?: string;
  center_id?: string;
  service_id: string;
  slot_id: string;
};

export type ReviewInput = {
  booking_id: string;
  user_email: string;
  rating: number;
  comment: string;
};

export type FavoriteCentersResponse = {
  favorite_center_ids: string[];
  centers: Center[];
};

export type BeautyStatItem = {
  count: number;
  label: string;
  percent: number;
};

export type UserBeautyStats = {
  summary: {
    total_treatments: number;
    top_treatment: string;
    top_category: string;
    top_time_slot: string;
  };
  treatments: BeautyStatItem[];
  categories: BeautyStatItem[];
  time_slots: BeautyStatItem[];
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
};

export type DashboardAgendaItem = {
  id: string;
  time_label: string;
  client_name: string;
  operator_name: string;
  service: string;
  status_label: string;
};

export type DashboardClient = {
  id: string;
  name: string;
  phone: string;
  last_visit: string | null;
};

export type CenterDashboard = {
  metrics: DashboardMetric[];
  agenda: DashboardAgendaItem[];
  clients: DashboardClient[];
};

export type CenterClient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bookings: number;
  last_visit: string | null;
};

export type CenterRegistrationInput = {
  name: string;
  email: string;
  password: string;
  vat_number: string;
  address: string;
  city: string;
  postal_code: string;
  province: string;
  country: string;
};

export type ActivationStatus = {
  state: string;
  subscription_status: string;
  onboarding_completed: boolean;
  missing_fields: string[];
  is_listable: boolean;
  message: string;
};

export type CenterRegistrationResponse = {
  center: Center;
  checkout_url: string | null;
  checkout_session_id: string;
  activation: ActivationStatus;
};

export type CenterOnboardingInput = {
  logo_url: string;
  opening_days: string[];
  opening_hours: Record<string, { start: string | null; end: string | null }>;
  primary_services: string[];
};

export type CenterOnboardingResponse = {
  center: Center;
  activation: ActivationStatus;
};

export type CenterProfileInput = {
  name: string;
  logo_url: string;
};

export type UserProfileInput = {
  name: string;
  phone: string;
};

export type CenterAvailabilityInput = {
  availability_overrides: Record<
    string,
    { enabled: boolean; start: string | null; end: string | null; note?: string | null }
  >;
};

export type CenterAvailabilityResponse = {
  center: Center;
  activation: ActivationStatus;
};

export type CenterServiceConfigInput = {
  services: Array<{
    name: string;
    category: string;
    duration: number | null;
    price: number | null;
    description?: string;
    visibility?: string;
  }>;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ClientRegistrationInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export type ClientAuthResponse = {
  user: UserProfile;
};

export type CenterAuthResponse = {
  center: Center;
  activation: ActivationStatus;
};

export type CenterActivationStatusResponse = {
  center_id: string;
  center_name: string;
  activation: ActivationStatus;
};
