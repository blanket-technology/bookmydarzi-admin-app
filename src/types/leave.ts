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
