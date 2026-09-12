import type { PaginatedResponse } from '@/types/api';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | string;

export interface TailorApplicationListItem {
  id: number;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  city?: string | null;
  state?: string | null;
  experience_years?: number | null;
  specialization?: string[] | null;
  status: ApplicationStatus;
  submitted_at: string;
}

export interface TailorApplicationDetail extends TailorApplicationListItem {
  address?: string | null;
  pincode?: string | null;
  aadhaar_front_url?: string | null;
  aadhaar_back_url?: string | null;
  pan_card_url?: string | null;
  profile_photo_url?: string | null;
  bank_passbook_url?: string | null;
  account_holder_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
  verification_status?: string | null;
  verification_remarks?: string | null;
  portfolio_images?: string[] | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  created_user_id?: number | null;
  pan_waived?: boolean;
  pan_waiver_reason?: string | null;
}

export interface TailorApplicationsResponse {
  applications?: TailorApplicationListItem[];
  items?: TailorApplicationListItem[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApplicationsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface RejectApplicationRequest {
  reason: string;
}

export interface ApplicationActionResponse {
  message?: string;
  application_id?: number;
  status?: ApplicationStatus;
}

export type PaginatedApplications = PaginatedResponse<TailorApplicationListItem>;
