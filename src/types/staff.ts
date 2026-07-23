import type { UserRole } from './auth';

export interface AdminStaffListItem {
  id: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  role: UserRole | string;
  is_active: boolean;
  tailor_id?: string;
  created_at?: string;
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
