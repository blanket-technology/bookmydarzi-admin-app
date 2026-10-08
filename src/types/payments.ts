// Mirrors backend app/constants/payment_status.py PaymentStatus.ALL — keep in sync.
export type PaymentStatus = 'initiated' | 'success' | 'failed' | 'refunded';

// Mirrors backend app/constants/payment_status.py PaymentType.ALL.
export type PaymentType = 'booking' | 'balance' | 'cod';

// Mirrors backend app/schemas/payment.py PaymentResponse.
export interface PaymentDetail {
  Id: number;
  PaymentCode: string | null;
  OrderId: number;
  UserId: number;
  Amount: number;
  Method: string | null;
  Status: PaymentStatus | string;
  TransactionId: string | null;
  FailureReason: string | null;
  SessionData?: Record<string, unknown> | null;
  payment_id?: number | null;
  amount_paise?: number | null;
  currency?: string | null;
  razorpay_order_id?: string | null;
  provider?: string | null;
  CreatedAt: string;
  UpdatedAt?: string | null;
  // Not on the base schema (extra="allow" passes through when the service adds it).
  PaymentType?: PaymentType | string;
}

// Mirrors backend app/schemas/payment.py PaymentStatusUpdate. Superadmin only.
export interface PaymentStatusUpdateRequest {
  status: PaymentStatus | string;
  transaction_id?: string;
  failure_reason?: string;
}

// Mirrors backend app/schemas/refund.py RefundCreateSchema.
export interface RefundCreateRequest {
  amount?: number;
  reason?: string;
}

// Mirrors backend app/schemas/refund.py RefundMarkManualSchema. Does not
// send money anywhere - the admin has already paid the customer manually
// (UPI/bank transfer via their own banking) and this records what they
// paid against. Only valid on a refund currently "failed".
export interface RefundMarkManualRequest {
  reference: string;
  note?: string;
}

// Mirrors backend app/schemas/refund.py RefundResponseSchema.
export interface RefundDetail {
  id: number;
  refund_code: string | null;
  payment_id: number;
  order_id: number | null;
  amount: number;
  reason: string | null;
  // manual_completed: Razorpay refund failed, an admin settled it
  // manually and recorded manual_reference/manual_note here.
  status: string;
  gateway_refund_id: string | null;
  failure_reason: string | null;
  manual_reference: string | null;
  manual_note: string | null;
  manually_completed_by: number | null;
  manually_completed_at: string | null;
  created_at: string;
}
