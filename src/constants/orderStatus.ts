import type { OrderStatus } from '@/types/orders';

// Mirrors backend app/constants/order_status.py OrderStatus — keep in sync.
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_PLACED: 'order_placed',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_REJECTED: 'order_rejected',
  SEARCHING_TAILOR: 'searching_tailor',
  BROADCASTED: 'broadcasted',
  TAILOR_ASSIGNED: 'tailor_assigned',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  PICKUP_PENDING: 'pickup_pending',
  PICKED_UP: 'picked_up',
  CLOTH_RECEIVED_BY_TAILOR: 'cloth_received_by_tailor',
  STITCHING_STARTED: 'stitching_started',
  IN_PROGRESS: 'in_progress',
  FINAL_CHECK: 'final_check',
  READY_FOR_DISPATCH: 'ready_for_dispatch',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, OrderStatus>;

export const ORDER_STATUS_ALL: OrderStatus[] = Object.values(ORDER_STATUS);

export const ORDER_STATUS_DISPLAY_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  payment_failed: 'Payment Failed',
  order_placed: 'Order Placed',
  order_accepted: 'Accepted',
  order_rejected: 'Rejected',
  searching_tailor: 'Searching Tailor',
  broadcasted: 'Broadcasted',
  tailor_assigned: 'Tailor Assigned',
  pickup_scheduled: 'Pickup Scheduled',
  pickup_pending: 'Pickup Pending',
  picked_up: 'Cloth Collected',
  cloth_received_by_tailor: 'Cloth Received by Tailor',
  stitching_started: 'Stitching Started',
  in_progress: 'In Progress',
  final_check: 'Final Check',
  ready_for_dispatch: 'Ready for Dispatch',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: '#f59e0b',
  payment_failed: '#ef4444',
  order_placed: '#3b82f6',
  order_accepted: '#6366f1',
  order_rejected: '#ef4444',
  searching_tailor: '#f97316',
  broadcasted: '#f97316',
  tailor_assigned: '#a855f7',
  pickup_scheduled: '#0ea5e9',
  pickup_pending: '#0ea5e9',
  picked_up: '#14b8a6',
  cloth_received_by_tailor: '#8b5cf6',
  stitching_started: '#8b5cf6',
  in_progress: '#0ea5e9',
  final_check: '#eab308',
  ready_for_dispatch: '#14b8a6',
  out_for_delivery: '#22c55e',
  delivered: '#22c55e',
  completed: '#10b981',
  cancelled: '#ef4444',
};

// Filter-chip options for order list screens ("All" + every real status).
export const ORDER_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  ...ORDER_STATUS_ALL.map((value) => ({
    label: ORDER_STATUS_DISPLAY_LABELS[value] ?? value,
    value,
  })),
];

// Mirrors backend _ADMIN_BLOCKED in app/services/orders/status_service.py —
// these are rejected by the generic admin PATCH .../status endpoint because
// they're each owned by a dedicated flow (broadcast system, payment
// verification, cancel-with-reason, employee delivery/complete endpoints).
const ADMIN_BLOCKED_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.ORDER_PLACED,
  ORDER_STATUS.TAILOR_ASSIGNED,
  ORDER_STATUS.SEARCHING_TAILOR,
  ORDER_STATUS.BROADCASTED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
]);

export const ADMIN_CORRECTABLE_STATUS_OPTIONS: { label: string; value: OrderStatus }[] =
  ORDER_STATUS_ALL.filter((value) => !ADMIN_BLOCKED_STATUSES.has(value)).map((value) => ({
    label: ORDER_STATUS_DISPLAY_LABELS[value] ?? value,
    value,
  }));

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_DISPLAY_LABELS[status] ?? status;
}
