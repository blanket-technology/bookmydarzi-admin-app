import type { OrderStatus } from '@/types/orders';
import { getLanguage, t } from '@/i18n';

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
  RETURN_PENDING: 'return_pending',
  RETURN_SCHEDULED: 'return_scheduled',
  RETURN_IN_TRANSIT: 'return_in_transit',
  RETURNED: 'returned',
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
  return_pending: 'Return Pending',
  return_scheduled: 'Return Scheduled',
  return_in_transit: 'Return In Transit',
  returned: 'Returned',
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
  pickup_scheduled: '#3b82f6',
  pickup_pending: '#3b82f6',
  picked_up: '#6366f1',
  cloth_received_by_tailor: '#8b5cf6',
  stitching_started: '#8b5cf6',
  in_progress: '#d946ef',
  final_check: '#eab308',
  ready_for_dispatch: '#84cc16',
  out_for_delivery: '#22c55e',
  delivered: '#22c55e',
  completed: '#10b981',
  cancelled: '#ef4444',
  return_pending: '#f59e0b',
  return_scheduled: '#3b82f6',
  return_in_transit: '#6366f1',
  returned: '#10b981',
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
// picked_up/cloth_received_by_tailor are additionally blocked because their
// dedicated endpoints now hard-require a Bridge employee already be
// assigned (assert_pickup_employee_assigned, does not exempt admins) -
// letting this generic endpoint set them would route around that gate.
const ADMIN_BLOCKED_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.ORDER_PLACED,
  ORDER_STATUS.TAILOR_ASSIGNED,
  ORDER_STATUS.SEARCHING_TAILOR,
  ORDER_STATUS.BROADCASTED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR,
]);

export const ADMIN_CORRECTABLE_STATUS_OPTIONS: { label: string; value: OrderStatus }[] =
  ORDER_STATUS_ALL.filter((value) => !ADMIN_BLOCKED_STATUSES.has(value)).map((value) => ({
    label: ORDER_STATUS_DISPLAY_LABELS[value] ?? value,
    value,
  }));

// Mirrors backend assign_bridge_service.py's _PICKUP_ASSIGN_FROM_UNCLAIMED_ONLY -
// every pre-delivery status past tailor_assigned where a pickup employee can
// still be manually attached, but ONLY as record-keeping (assigned_employee_id
// must still be unset) - covers orders an admin walked through the pickup
// pipeline via the employee-action endpoints' admin-bypass without ever
// assigning anyone.
export const PICKUP_ASSIGNABLE_UNCLAIMED_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.ORDER_ACCEPTED,
  ORDER_STATUS.PICKUP_PENDING,
  ORDER_STATUS.PICKUP_SCHEDULED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR,
  ORDER_STATUS.STITCHING_STARTED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.FINAL_CHECK,
  ORDER_STATUS.READY_FOR_DISPATCH,
]);

// Reads the module-level i18n language (kept in sync by useLanguageStore),
// not a hook - this is a plain function called from many non-component
// contexts (dashboard.tsx's OrderRow, list filter chips, etc.), where a
// React hook can't be used. t()'s own English-fallback behaviour (see
// src/i18n/index.ts) already covers any status missing a Hindi translation,
// so this only needs to defer entirely to the catalog.
export function orderStatusLabel(status: string): string {
  if (getLanguage() === 'en') return ORDER_STATUS_DISPLAY_LABELS[status] ?? status;
  return t(`orderStatus.${status}`) !== `orderStatus.${status}`
    ? t(`orderStatus.${status}`)
    : ORDER_STATUS_DISPLAY_LABELS[status] ?? status;
}

// Mirrors backend EMPLOYEE_QUEUE_EXCLUDED in app/constants/employee_orders.py —
// orders in these statuses are outside the employee operations queue entirely
// (assert_can_view_employee_order rejects any employee action on them).
export const EMPLOYEE_QUEUE_EXCLUDED_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAYMENT_FAILED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.ORDER_REJECTED,
]);
