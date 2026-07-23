import type { UserRole } from './auth';

export interface AdminUserItem {
  id: string;
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
