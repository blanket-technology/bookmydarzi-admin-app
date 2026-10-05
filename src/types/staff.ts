import type { UserRole } from './auth';

export interface AdminStaffListItem {
  id: string;
  user_code?: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  role: UserRole | string;
  is_active: boolean;
  tailor_id?: string;
  created_at?: string;
  profile_image_url?: string | null;
}

// Mirrors app/schemas/staff.py exactly — GET /admin/staff/{id}. All bridge_*
// sections are only populated when role === "employee"; null/absent for
// tailor/admin/superadmin accounts.
export interface StaffAssignedOrderSummary {
  id: string;
  order_code?: string | null;
  status: string;
  created_at: string;
}

export interface BridgeProfessionalDetails {
  experience_years?: number | null;
  bridge_type?: 'full_time' | 'freelancer' | string | null;
  assigned_area?: string | null;
  vehicle_type?: string | null;
  working_shift?: string | null;
  joining_date?: string | null;
  max_orders_per_day?: number | null;
}

export interface BridgeDeliveryPerformance {
  total_pickups: number;
  total_deliveries: number;
  todays_pickups: number;
  todays_deliveries: number;
  pending_pickups: number;
  pending_deliveries: number;
  cancelled_orders: number;
  failed_deliveries: number;
}

export interface BridgePerformanceMetrics {
  on_time_pickup_rate?: number | null;
  on_time_delivery_rate?: number | null;
  average_delivery_minutes?: number | null;
  customer_rating?: number | null;
  completed_orders: number;
}

export interface BridgeWorkload {
  orders_assigned: number;
  orders_accepted: number;
  orders_rejected: number;
  current_active_orders: number;
  max_orders_per_day?: number | null;
}

export interface BridgeEarnings {
  total_earnings: number;
  incentives_earned: number;
}

export interface BridgeDocuments {
  aadhar_url?: string | null;
  pan_card_url?: string | null;
  other_doc_url?: string | null;
  is_approved: boolean;
}

export interface AdminStaffDetail extends AdminStaffListItem {
  assigned_orders_count: number;
  assigned_orders: StaffAssignedOrderSummary[];
  bridge_professional_details?: BridgeProfessionalDetails | null;
  bridge_delivery_performance?: BridgeDeliveryPerformance | null;
  bridge_performance_metrics?: BridgePerformanceMetrics | null;
  bridge_workload?: BridgeWorkload | null;
  bridge_earnings?: BridgeEarnings | null;
  bridge_documents?: BridgeDocuments | null;
}

// PATCH /admin/staff/{id} — account fields only.
export interface StaffUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  is_active?: boolean;
}

// PATCH /admin/staff/{id}/bridge-profile — professional + earnings fields.
export interface BridgeProfileUpdateRequest {
  experience_years?: number;
  bridge_type?: string;
  assigned_area?: string;
  vehicle_type?: string;
  working_shift?: string;
  joining_date?: string;
  max_orders_per_day?: number;
  total_earnings?: number;
  incentives_earned?: number;
}

export interface StaffCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password: string;
  role: UserRole | string;
  is_active?: boolean;
  specialization?: string;
  experience?: number;
  location?: string;
  bio?: string;
  portfolio_images?: string[];
}

export interface StaffCreateResponse {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  tailor_id?: string;
  message?: string;
}

// GET /admin/staff returns a bare JSON array (response_model=List[AdminStaffListItem]),
// not a {staff:[...]} / {items:[...]} wrapper.
export type StaffListResponse = AdminStaffListItem[];

// GET /admin/staff/paginated - the real paginated counterpart, unlike
// StaffListResponse above.
export interface StaffPaginatedResponse {
  items: AdminStaffListItem[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}
