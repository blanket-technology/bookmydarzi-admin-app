// Mirrors app/schemas/tailor_payout.py exactly.

export interface Payout {
  id: number;
  order_id: number;
  order_code: string | null;
  tailor_id: number;
  tailor_name: string | null;
  order_amount: string; // Decimal, serialized as string
  commission_percent: string;
  payout_amount: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  paid_by_admin_id: number | null;
  payout_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PayoutListResponse {
  payouts: Payout[];
  total: number;
  page: number;
  limit: number;
}

export interface PayoutListParams {
  page?: number;
  limit?: number;
  tailor_id?: number;
  status?: 'pending' | 'paid';
}

// GET /tailors/me/payouts (tailor self-service) returns this shape, not
// Payout - the backend deliberately omits order_amount (the customer's
// FinalAmount) from this endpoint. See TailorPayoutResponse's docstring in
// app/schemas/tailor_payout.py. Never add order_amount here.
export interface TailorSelfPayout {
  id: number;
  order_id: number;
  order_code: string | null;
  commission_percent: string;
  payout_amount: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  payout_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface TailorSelfPayoutListResponse {
  payouts: TailorSelfPayout[];
  total: number;
  page: number;
  limit: number;
}

export interface PayoutMarkPaidRequest {
  payout_reference: string;
  notes?: string;
}

export interface TailorPayoutSummary {
  tailor_id: number;
  pending_amount: string;
  paid_amount: string;
  pending_count: number;
  paid_count: number;
}

export interface CommissionRate {
  id: number;
  tailor_id: number;
  tailor_name: string | null;
  category_id: number | null;
  category_name: string | null;
  commission_percent: string;
  created_at: string;
  updated_at: string | null;
}

export interface CommissionRateCreateRequest {
  tailor_id: number;
  category_id: number | null;
  commission_percent: string;
}
