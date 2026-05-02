export type Center = {
  id: string;
  email: string;
  name: string;
  branding: {
    logo?: string;
    primary_color?: string;
  };
  opening_hours: Record<string, { start: string | null; end: string | null }>;
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
  created_at?: string;
};

export type Booking = {
  id: string;
  center_id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  operator_name: string;
  status: string;
  start_time?: string;
  end_time?: string;
  date_label: string | null;
  time_label: string | null;
  price: number | null;
  created_at?: string;
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
