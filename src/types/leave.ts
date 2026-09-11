// Mirrors app/schemas/leave_request.py's LeaveRequestOut - PascalCase,
// matches the backend response directly (no normalization layer, same
// convention as TailorOnlineStatus in types/broadcasts.ts).
export interface LeaveRequest {
  Id: number;
  UserId: number;
  Role: 'tailor' | 'employee';
  StartDate: string;
  EndDate: string;
  Reason?: string | null;
  Status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  ProcessedBy?: number | null;
  ProcessedAt?: string | null;
  AdminNotes?: string | null;
  CreatedAt: string;
}

export interface CreateLeaveRequestPayload {
  start_date: string;
  end_date: string;
  reason?: string;
}

// Mirrors app/schemas/leave_request.py's LeaveRequestListItemOut - the
// admin-review list adds the requester's display name/mobile since an admin
// reviewing everyone's requests has no other way to identify whose row this is.
export interface LeaveRequestListItem extends LeaveRequest {
  UserName?: string | null;
  UserMobile?: string | null;
}

export interface LeaveRequestListResponse {
  items: LeaveRequestListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  role?: 'tailor' | 'employee';
}

export interface ApproveLeaveRequestPayload {
  admin_notes?: string;
}

export interface RejectLeaveRequestPayload {
  admin_notes: string;
}
