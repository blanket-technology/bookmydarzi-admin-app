// Mirrors backend app/constants/payment_status.py PaymentStatus.ALL — keep in sync.
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  initiated: 'Initiated',
  success: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  initiated: '#f59e0b',
  success: '#22c55e',
  failed: '#ef4444',
  refunded: '#6366f1',
};

export function paymentStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

// Manual superadmin correction only (require_superadmin server-side) — used by
// the "Correct Payment Status" picker on the payment detail sheet.
export const PAYMENT_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];
