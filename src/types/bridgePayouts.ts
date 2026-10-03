// Mirrors app/schemas/bridge_payout.py exactly.

export type BridgeLegType = 'pickup' | 'delivery' | 'return' | 'repair_pickup' | 'repair_delivery';

export interface BridgePayout {
  id: number;
  order_id: number;
  order_code: string | null;
  leg_type: BridgeLegType;
  employee_id: number;
  employee_name: string | null;
  rate_amount: string; // Decimal, serialized as string
  status: 'pending' | 'paid';
  paid_at: string | null;
  paid_by_admin_id: number | null;
  payout_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface BridgePayoutListResponse {
  payouts: BridgePayout[];
  total: number;
  page: number;
  limit: number;
}

export interface BridgePayoutListParams {
  page?: number;
  limit?: number;
  employee_id?: number;
  leg_type?: BridgeLegType;
  status?: 'pending' | 'paid';
}

export interface BridgePayoutMarkPaidRequest {
  payout_reference: string;
  notes?: string;
}

export interface BridgePayoutSummary {
  employee_id: number;
  pending_amount: string;
  paid_amount: string;
  pending_count: number;
  paid_count: number;
}

export interface BridgeLegRate {
  id: number;
  employee_id: number;
  employee_name: string | null;
  leg_type: BridgeLegType | null;
  rate_amount: string;
  created_at: string;
  updated_at: string | null;
}

export interface BridgeLegRateCreateRequest {
  employee_id: number;
  leg_type: BridgeLegType | null;
  rate_amount: string;
}
