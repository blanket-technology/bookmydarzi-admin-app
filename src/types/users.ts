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

export interface UserStatusUpdateRequest {
  action: 'activate' | 'deactivate';
}
