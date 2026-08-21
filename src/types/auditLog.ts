// Mirrors app/api/v1/endpoints/admin.py's list_audit_logs / audit_log_filter_options
// inline response shapes (this subsystem has no dedicated Pydantic schema file).
export interface AuditLogItem {
  id: number;
  action: string;
  performed_by: number | null;
  performed_by_name: string | null;
  order_id: number | null;
  tailor_id: number | null;
  user_id: number | null;
  application_id: number | null;
  // AuditLog.Details is a JSON column (app/models/audit_log.py) - callers
  // across the codebase pass arbitrary structured payloads (e.g.
  // {leg, reason}), not just strings, so this must render defensively.
  details: unknown;
  created_at: string | null;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  limit: number;
  items: AuditLogItem[];
}

export interface AuditLogActor {
  id: number;
  name: string;
  role: string;
}

export interface AuditLogFilterOptions {
  actors: AuditLogActor[];
  actions: string[];
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  user_id?: number;
  performed_by?: number;
  action?: string;
  date_from?: string;
  date_to?: string;
}
