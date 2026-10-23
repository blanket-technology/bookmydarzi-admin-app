// Covers BOTH vocabularies from app/constants/payment_status.py, same as
// Admin_Web's paymentConstants.js PAYMENT_STATUS_LABELS:
//   - PaymentStatus (a single transaction row): initiated/success/failed/
//     refunded.
//   - OrderPaymentStatus (an order's settlement state): payment_pending/
//     advance_pending (legacy)/advance_paid (legacy)/fully_paid/
//     advance_failed/balance_pending (legacy)/cod_pending.
// Bug fix (BUG-16): paymentStatusLabel() used to only know the transaction
// vocabulary, so passing it an order-level status (e.g. the Payments screen
// badge, or OrderSummaryCard's raw capitalize() bypassing it entirely)
// fell through to the raw enum value - "Advance Pending" instead of
// "Online Payment Pending" on any pre-rename order.
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  // Payment-record status
  initiated: 'Initiated',
  success: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
  pending: 'Pending',
  // Order-level settlement status - payment_pending is the current name
  // (BUG-118 rename); advance_pending is kept for historical orders
  // created before the rename.
  payment_pending: 'Online Payment Pending',
  advance_pending: 'Online Payment Pending',
  advance_paid: 'Paid',
  fully_paid: 'Paid',
  advance_failed: 'Failed',
  balance_pending: 'Balance Pending',
  cod_pending: 'Pay on Delivery',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  initiated: '#f59e0b',
  success: '#22c55e',
  failed: '#ef4444',
  refunded: '#6366f1',
};

export function paymentStatusLabel(status?: string | null): string {
  if (!status) return '—';
  const key = status.toLowerCase().trim();
  if (PAYMENT_STATUS_LABELS[key]) return PAYMENT_STATUS_LABELS[key];
  // Any other/unmapped value still reads as plain words instead of a raw
  // snake_case enum, e.g. "balance_pending" -> "Balance Pending".
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Manual superadmin correction only (require_superadmin server-side) — used by
// the "Correct Payment Status" picker on the payment detail sheet.
export const PAYMENT_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

// Distinct from PaymentStatus above: this is the ORDER's settlement state
// (app/constants/payment_status.py OrderPaymentStatus), not a single
// transaction's status. Used for the GET /admin/orders?payment_status=
// filter, which the backend docstrings this same enum against.
//
// The advance/balance split is retired (full amount is charged upfront), so
// the dead advance_paid/balance_pending values are dropped and the remaining
// ones use plain-language labels. Backend filter VALUES are unchanged
// (advance_pending = the single pending online payment). Mirrors Admin_Web.
export const ORDER_PAYMENT_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Online Payment Pending', value: 'advance_pending' },
  { label: 'Paid', value: 'fully_paid' },
  { label: 'Failed', value: 'advance_failed' },
  { label: 'Pay on Delivery', value: 'cod_pending' },
];

// Mirrors backend status_service.VALID_TRANSITIONS: only these corrections are
// accepted, so only these are offered.
export const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  initiated: ['success', 'failed'],
  success: ['refunded'],
  failed: ['initiated', 'success'],
  refunded: [],
};

export function allowedPaymentStatusOptions(current?: string | null) {
  const allowed = PAYMENT_STATUS_TRANSITIONS[(current ?? '').toLowerCase()] ?? [];
  return [
    { label: 'Initiated', value: 'initiated' },
    ...PAYMENT_STATUS_OPTIONS,
  ].filter((option) => allowed.includes(option.value));
}
