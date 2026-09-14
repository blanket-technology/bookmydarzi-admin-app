// Mirrors app/schemas/cancellation.py. This is a separate, more sophisticated
// workflow from AdminCancelOrderRequest (admin force-cancel) — it models
// customer-initiated cancellation requests that go through admin
// approve/reject with a computed penalty/refund split.
export type CancellationStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'contact_support';

export interface CancellationListItem {
  Id: number;
  CancellationCode?: string | null;
  OrderId: number;
  OrderCode?: string | null;
  CustomerName?: string | null;
  CustomerPhone?: string | null;
  PaymentType: string;
  PaidAmount: number;
  RefundAmount: number;
  OverrideRefundAmount?: number | null;
  Status: CancellationStatus | string;
  OrderStageAtCancel?: string | null;
  CreatedAt: string;
  ProcessedAt?: string | null;
}

export interface CancellationListResponse {
  total: number;
  skip: number;
  limit: number;
  items: CancellationListItem[];
}

export interface OrderCancellationDetail {
  Id: number;
  CancellationCode?: string | null;
  OrderId: number;
  OrderStageAtCancel?: string | null;
  PaymentType: string;
  PaidAmount: number;
  PenaltyPct: number;
  PenaltyAmount: number;
  RefundPct: number;
  RefundAmount: number;
  OverrideRefundAmount?: number | null;
  Reason?: string | null;
  Status: CancellationStatus | string;
  RefundId?: number | null;
  AdminNotes?: string | null;
  CreatedAt: string;
  ProcessedAt?: string | null;
}

export interface CancellationApproveRequest {
  override_refund_amount?: number;
  admin_notes?: string;
}

export interface CancellationRejectRequest {
  admin_notes: string;
}

export interface CancellationPatchRequest {
  override_refund_amount?: number;
  admin_notes?: string;
}

export interface CancellationPolicyItem {
  Id: number;
  OrderStage: string;
  DisplayStage: string;
  PenaltyPct?: number | null;
  CancellationAllowed: boolean;
  PolicyDescription?: string | null;
  SortOrder: number;
}

export interface CancellationPolicyUpdate {
  PenaltyPct?: number;
  CancellationAllowed?: boolean;
  PolicyDescription?: string;
  DisplayStage?: string;
}

export interface CancellationsQueryParams {
  status?: string;
  payment_type?: string;
  skip?: number;
  limit?: number;
}

// Mirrors app/schemas/cancellation.py's CancellationPreviewOut. Used by both
// the customer-app preview and (via the admin preview endpoint, is_admin=
// True/waive_penalty on the backend) the admin Cancel Order sheet, so an
// admin sees the exact same penalty/refund math before confirming.
export interface CancellationPreview {
  order_id: number;
  order_code: string;
  current_stage: string;
  display_stage: string;
  payment_type: 'prepaid' | 'postpaid';
  cancellation_allowed: boolean;
  contact_support: boolean;
  paid_amount: number;
  penalty_pct: number;
  penalty_amount: number;
  refund_pct: number;
  refund_amount: number;
  policy_description?: string | null;
  cancel_reason?: string | null;
}
