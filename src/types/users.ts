import type { UserRole } from './auth';

export interface AdminUserItem {
  id: string;
  user_code?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  role: UserRole | string;
  is_active: boolean;
  is_email_verified?: boolean;
  is_mobile_verified?: boolean;
  created_at?: string;
  last_login?: string;
  profile_image_url?: string;
  orders_count?: number;
}

export interface AdminUsersResponse {
  users?: AdminUserItem[];
  items?: AdminUserItem[];
  total?: number;
}

// Raw shape of GET /admin/users rows and GET /admin/users/{id} — backend
// returns build_admin_user_list_item()/UserResponse directly (PascalCase),
// not the snake_case AdminUserItem shape above. Normalized client-side by
// customerService so screens (customers/index.tsx, customers/[id].tsx) only
// ever see AdminUserItem.
export interface RawAdminUser {
  Id: number;
  UserCode?: string | null;
  FirstName?: string | null;
  LastName?: string | null;
  FullName?: string | null;
  Email?: string | null;
  Mobile?: string | null;
  Role: string;
  IsActive: boolean;
  IsEmailVerified?: boolean;
  IsMobileVerified?: boolean;
  CreatedAt?: string | null;
  LastLogin?: string | null;
  ProfileImageUrl?: string | null;
}

export interface RawAdminUsersResponse {
  users: RawAdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStatusUpdateRequest {
  action: 'activate' | 'deactivate';
}

// Mirrors GET /admin/customers/{id}/full-detail exactly (admin.py's
// get_customer_full_detail) — a single aggregate response covering
// everything about a customer beyond orders/audit-log (which have their
// own paginated endpoints). Each section is capped to 10 recent items
// server-side, not fully paginated — this is a detail-page summary, not a
// list screen replacement.
export interface CustomerAddress {
  id: string;
  full_name?: string | null;
  mobile?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  address_type?: string | null;
  is_default?: boolean;
}

export interface CustomerMeasurementSummary {
  id: string;
  profile_name: string;
  gender?: string | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulder?: number | null;
  height?: number | null;
  fit_preference?: string | null;
  is_default?: boolean;
}

export interface CustomerPaymentSummary {
  id: string;
  payment_code?: string | null;
  order_id?: string | null;
  amount: number;
  method?: string | null;
  status?: string | null;
  payment_type?: string | null;
  created_at?: string | null;
}

export interface CustomerCartSummary {
  id: string;
  status?: string | null;
  total_amount: number;
  item_count: number;
  created_at?: string | null;
}

export interface CustomerSupportTicketSummary {
  id: string;
  ticket_code?: string | null;
  subject?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  order_id?: string | null;
  created_at?: string | null;
}

export interface CustomerChatSessionSummary {
  id: string;
  uuid: string;
  issue_category?: string | null;
  status?: string | null;
  ai_handled?: boolean;
  order_id?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
}

export interface CustomerCancellationSummary {
  id: string;
  cancellation_code?: string | null;
  order_id?: string | null;
  status?: string | null;
  penalty_amount: number;
  refund_amount: number;
  created_at?: string | null;
}

export interface CustomerPenaltySummary {
  id: string;
  order_id?: string | null;
  penalty_amount: number;
  is_applied?: boolean;
  applied_to_order_id?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
}

export interface CustomerWishlistItemSummary {
  id: string;
  item_type?: string | null;
  service_id?: string | null;
  tailor_id?: string | null;
  created_at?: string | null;
}

export interface CustomerFullDetail {
  addresses: CustomerAddress[];
  measurements: CustomerMeasurementSummary[];
  payments: { total: number; items: CustomerPaymentSummary[] };
  carts: { total: number; items: CustomerCartSummary[] };
  support_tickets: { total: number; items: CustomerSupportTicketSummary[] };
  chat_sessions: { total: number; items: CustomerChatSessionSummary[] };
  cancellations: { total: number; items: CustomerCancellationSummary[] };
  penalties: { total: number; items: CustomerPenaltySummary[] };
  wishlist: { total: number; items: CustomerWishlistItemSummary[] };
}

// Audit log types live in types/auditLog.ts (the dedicated Audit Log
// screen's own module) - this file used to duplicate a stale AuditLogItem/
// AuditLogsResponse pair for a second, parallel auditLogService/useAuditLogs
// wrapper around the identical /api/v1/admin/audit-logs endpoint, used only
// by the customer detail screen's activity timeline. That's gone now; the
// customer detail screen calls the canonical hook directly.
