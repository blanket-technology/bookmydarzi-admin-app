import { ORDER_STATUS } from '@/constants/orderStatus';
import type { AdminOrderItem } from '@/types/orders';

// The backend has no employee-specific dashboard aggregation endpoint (only
// GET /admin/dashboard, which is ADMIN/SUPERADMIN only — see
// app/services/admin/dashboard_service.py). Employees can call
// GET /admin/orders (require_roles ADMIN, SUPERADMIN, EMPLOYEE), so these
// counts are derived client-side from that same list the Orders tab already
// fetches. This intentionally does not aggregate beyond the current page —
// see EmployeeDashboardStats for the caveat surfaced in the UI.
export interface EmployeeDashboardStats {
  assignedToday: number;
  pickupToday: number;
  deliveryToday: number;
  codPending: number;
}

const isToday = (isoDate: string | undefined): boolean => {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export const computeEmployeeDashboardStats = (
  orders: AdminOrderItem[],
): EmployeeDashboardStats => {
  let assignedToday = 0;
  let pickupToday = 0;
  let deliveryToday = 0;
  let codPending = 0;

  for (const order of orders) {
    if (isToday(order.created_at) && order.status !== ORDER_STATUS.ORDER_REJECTED) {
      assignedToday += 1;
    }
    if (
      isToday(order.scheduled_pickup_at) &&
      (order.status === ORDER_STATUS.PICKUP_SCHEDULED || order.status === ORDER_STATUS.PICKUP_PENDING)
    ) {
      pickupToday += 1;
    }
    if (isToday(order.expected_delivery_date) && order.status === ORDER_STATUS.OUT_FOR_DELIVERY) {
      deliveryToday += 1;
    }
    if (
      order.status === ORDER_STATUS.OUT_FOR_DELIVERY &&
      typeof order.remaining_amount === 'number' &&
      order.remaining_amount > 0
    ) {
      codPending += 1;
    }
  }

  return { assignedToday, pickupToday, deliveryToday, codPending };
};

// Tailor dashboard — derived client-side from GET /orders/my-orders (the only
// order list endpoint the TAILOR role can call; no backend aggregation
// endpoint exists for it). Statuses per app/constants/order_status.py:
// TAILOR_ALLOWED_TARGETS covers stitching_started/in_progress/final_check/
// ready_for_dispatch; "assigned" here means the order is with this tailor but
// stitching hasn't started yet.
export interface TailorDashboardStats {
  assigned: number;
  stitching: number;
  ready: number;
  completed: number;
}

const STITCHING_STATUSES = new Set<string>([
  ORDER_STATUS.STITCHING_STARTED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.FINAL_CHECK,
]);

export const computeTailorDashboardStats = (
  orders: AdminOrderItem[],
): TailorDashboardStats => {
  let assigned = 0;
  let stitching = 0;
  let ready = 0;
  let completed = 0;

  for (const order of orders) {
    if (order.status === ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR) {
      assigned += 1;
    } else if (STITCHING_STATUSES.has(order.status)) {
      stitching += 1;
    } else if (order.status === ORDER_STATUS.READY_FOR_DISPATCH) {
      ready += 1;
    } else if (order.status === ORDER_STATUS.COMPLETED) {
      completed += 1;
    }
  }

  return { assigned, stitching, ready, completed };
};
