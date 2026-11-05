// Mirrors app/api/v1/endpoints/employee.py's Cash* response models and
// app/api/v1/endpoints/admin.py's AdminCashSettlementResponse/
// AdminCashLedgerSummary.

export interface CashBalance {
  unsettled_balance: number;
  cap: number;
  is_over_cap: boolean;
}

export interface CashLedgerEntry {
  id: number;
  order_id: number;
  order_code: string | null;
  amount: number;
  channel: 'cash' | 'employee_upi';
  is_settled: boolean;
  created_at: string | null;
}

export type CashSettlementStatus = 'pending' | 'confirmed' | 'rejected';

export interface CashSettlement {
  id: number;
  settlement_code: string | null;
  amount: number;
  status: CashSettlementStatus;
  method: string | null;
  reference: string | null;
  proof_image_url: string | null;
  admin_note: string | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface AdminCashSettlement extends CashSettlement {
  employee_id: number;
  employee_name: string;
  employee_note: string | null;
}

export interface AdminCashBalanceSummary {
  employee_id: number;
  employee_name: string;
  unsettled_balance: number;
  is_over_cap: boolean;
}

export interface CashSettlementSubmitRequest {
  amount: number;
  method?: string;
  reference?: string;
  note?: string;
}
