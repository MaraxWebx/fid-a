import type { AppointmentStatus } from '../lib/appointmentStatus';

export type Center = {
  id: string;
  center_uid?: string;
  invitation_code?: string;
  onboarding_link?: string;
  qr_payload?: string;
  email: string;
  name: string;
  owner_name?: string | null;
  phone?: string | null;
  address?: string | null;
  subscription_plan?: string;
  branding: {
    description?: string;
    instagram_url?: string;
    logo?: string;
    tiktok_url?: string;
  };
  logoStoragePath?: string | null;
  opening_hours: Record<
    string,
    {
      break_enabled?: boolean;
      break_end?: string | null;
      break_start?: string | null;
      end: string | null;
      slots?: Array<{ start: string | null; end: string | null }>;
      start: string | null;
    }
  >;
  opening_days?: string[];
  availability_overrides?: Record<
    string,
    { enabled: boolean; start: string | null; end: string | null; note?: string | null }
  >;
  enableWhatsapp?: boolean;
  whatsappPhoneNumber?: string;
  whatsappBookingMessageTemplate?: string;
  whatsappInfoMessageTemplate?: string;
  whatsappAppointmentReminderTemplate?: string;
  showWhatsappButtonToClients?: boolean;
  staff_members?: StaffMember[];
  rooms?: Room[];
  calendar_exceptions?: CalendarException[];
  slot_step_minutes?: number;
  primary_services?: string[];
  registration_status?: string;
  subscription_status?: string;
  is_listable?: boolean;
  rating_average?: number | null;
  reviews_count?: number;
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
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  is_bookable_online?: boolean;
  required_room_type?: string | null;
  required_room_ids?: string[];
  assigned_staff_ids?: string[];
  created_at?: string;
};

export type StaffMember = {
  id: string;
  center_id?: string;
  name: string;
  role?: string;
  avatar_url?: string | null;
  is_active: boolean;
  working_hours?: Center['opening_hours'];
  service_ids?: string[];
  created_at?: string;
  updated_at?: string;
};

export type Room = {
  id: string;
  center_id?: string;
  name: string;
  type?: string;
  is_active: boolean;
  compatible_treatment_ids?: string[];
  compatible_treatment_names?: string[];
  created_at?: string;
  updated_at?: string;
};

export type CalendarException = {
  id: string;
  center_id?: string;
  date: string;
  type: 'closed' | 'special_opening' | 'staff_unavailable' | 'room_unavailable';
  start_time?: string | null;
  end_time?: string | null;
  staff_member_id?: string | null;
  room_id?: string | null;
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  center_id: string | null;
  center_membership_ids?: string[];
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
  staff_member_id?: string | null;
  room_id?: string | null;
  client_name?: string;
  client_phone?: string;
  is_delayed?: boolean | null;
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
  staff_member_id?: string | null;
  staff_member_name?: string | null;
  room_id?: string | null;
  room_name?: string | null;
  distance_minutes?: number;
};

export type BookingSlotAlternativesResponse = {
  center_id: string;
  service_id: string;
  date: string;
  requested_time: string;
  suggestions: BookingSlot[];
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
  staff_member_id?: string | null;
  room_id?: string | null;
};

export type BookingUpdateInput = {
  role: 'client' | 'center';
  user_email?: string;
  center_id?: string;
  service_id: string;
  slot_id: string;
  staff_member_id?: string | null;
  room_id?: string | null;
};

export type BookingStatusInput = {
  role: 'center';
  center_id: string;
  status: AppointmentStatus | string;
  cancellation_reason?: string | null;
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
  start_time?: string | null;
  end_time?: string | null;
  time_label: string;
  client_name: string;
  operator_name: string;
  service: string;
  is_delayed?: boolean | null;
  status_label: string;
  duration_label?: string | null;
  canceled_at?: string | null;
  cancellation_reason?: string | null;
  client_cancellations_count?: number;
  status_history?: Array<{
    changed_at?: string;
    changed_by?: string;
    reason?: string | null;
    status: string;
  }>;
};

export type DashboardClientHistoryItem = {
  id: string;
  service_name: string;
  date_label: string;
  time_label: string;
  status: string;
};

export type DashboardClient = {
  id: string;
  name: string;
  phone: string;
  last_visit: string | null;
  history?: DashboardClientHistoryItem[];
};

export type CenterDashboard = {
  metrics: DashboardMetric[];
  agenda: DashboardAgendaItem[];
  clients: DashboardClient[];
};

export type BusinessInsightPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

export type BusinessBreakdownItem = {
  label: string;
  value: number;
  percent: number;
};

export type BusinessInsights = {
  period: {
    key: BusinessInsightPeriod;
    label: string;
    start: string;
    end: string;
  };
  kpis: {
    expected_revenue: number;
    confirmed_revenue: number;
    no_show_losses: number;
    average_ticket?: number;
  };
  operations?: {
    total_appointments: number;
    free_slots: number;
    occupancy_rate: number;
    cancellations: number;
    no_shows: number;
  };
  breakdowns: {
    categories: BusinessBreakdownItem[];
    staff: BusinessBreakdownItem[];
    weekdays: BusinessBreakdownItem[];
    time_slots: BusinessBreakdownItem[];
  };
  top_treatments?: Array<{
    label: string;
    bookings: number;
    revenue: number;
    average_duration: number;
  }>;
  staff_performance?: Array<{
    label: string;
    appointments: number;
    revenue: number;
    occupancy_rate: number;
    average_review?: number | null;
  }>;
  insights: string[];
  no_show_report: {
    deleted?: boolean;
    deleted_at?: string | null;
    total_losses: number;
    repeated_clients: Array<{ label: string; count: number; value: number }>;
    worst_time_slots: BusinessBreakdownItem[];
    affected_services: BusinessBreakdownItem[];
  };
};

export type CenterClient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bookings: number;
  last_visit: string | null;
};

export type CenterClientDetail = {
  client: UserProfile;
  bookings: Booking[];
  reviews: Review[];
  stats: UserBeautyStats;
};

export type CenterRegistrationInput = {
  name: string;
  owner_name: string;
  email: string;
  password: string;
  phone: string;
  subscription_plan: string;
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
  subscription_plan?: string;
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
  opening_hours: Record<
    string,
    {
      break_enabled?: boolean;
      break_end?: string | null;
      break_start?: string | null;
      end: string | null;
      slots?: Array<{ start: string | null; end: string | null }>;
      start: string | null;
    }
  >;
  primary_services: string[];
  staff_members?: Array<{
    id?: string;
    name: string;
    role?: string | null;
    avatar_url?: string | null;
    is_active: boolean;
    working_hours?: Center['opening_hours'];
    service_ids?: string[];
  }>;
  rooms?: Array<{
    id?: string;
    name: string;
    type?: string | null;
    is_active: boolean;
    compatible_treatment_ids?: string[];
    compatible_treatment_names?: string[];
  }>;
  calendar_exceptions?: Array<Omit<CalendarException, 'center_id' | 'created_at' | 'updated_at'>>;
  slot_step_minutes?: number;
};

export type CenterOnboardingResponse = {
  center: Center;
  activation: ActivationStatus;
};

export type CenterLogoUploadResponse = CenterOnboardingResponse & {
  logoUrl: string;
  logoStoragePath?: string | null;
};

export type CenterProfileInput = {
  description: string;
  enableWhatsapp?: boolean;
  instagram_url: string;
  name: string;
  logo_url: string;
  showWhatsappButtonToClients?: boolean;
  tiktok_url: string;
  whatsappAppointmentReminderTemplate?: string;
  whatsappBookingMessageTemplate?: string;
  whatsappInfoMessageTemplate?: string;
  whatsappPhoneNumber?: string;
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
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    is_bookable_online?: boolean;
    required_room_type?: string | null;
    required_room_ids?: string[];
    assigned_staff_ids?: string[];
  }>;
};

export type LoginInput = {
  email: string;
  password: string;
  invitation_code?: string;
};

export type ClientRegistrationInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  invitation_code?: string;
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

export type CenterMembershipsResponse = {
  center_ids: string[];
  centers: Center[];
  memberships: Array<{
    center_id: string;
    status: string;
    loyalty?: {
      points?: number;
      tier?: string;
      rewards_unlocked?: string[];
    };
    created_at?: string;
  }>;
};

export type InvitationResolveResponse = {
  center: Center;
  invitation_code: string;
  center_uid: string;
  onboarding_link: string;
};

export type CenterAssociationInput = {
  email: string;
  invitation_code: string;
};

export type CenterAssociationResponse = {
  user: UserProfile;
  center: Center;
  membership_status: string;
};
