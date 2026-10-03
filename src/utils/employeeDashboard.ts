import { ORDER_STATUS } from '@/constants/orderStatus';
import type { AdminOrderItem } from '@/types/orders';

// The backend has no employee-specific dashboard aggregation endpoint (only
// GET /admin/dashboard, which is ADMIN/SUPERADMIN only — see
// app/services/admin/dashboard_service.py). Employees can call
// GET /admin/orders (require_roles ADMIN, SUPERADMIN, EMPLOYEE), so these
// counts are derived client-side from that same list the Orders tab already
// fetches. This intentionally does not aggregate beyond the current page —
// see EmployeeDashboardStats for the caveat surfaced in the UI.
// Kept identical to Admin_Web's computeEmployeeStats (web
// src/features/dashboard/utils/dashboardUtils.js) so the Bridge/employee
// dashboard reads the same on web and app: queue-based counts (not "today"
// gating) plus a Today's Tasks metric. Change both files together.
export interface EmployeeDashboardStats {
  assigned: number;
  pickupQueue: number;
  deliveryQueue: number;
  codPending: number;
  todaysTasks: number;
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
  let assigned = 0;
  let pickupQueue = 0;
  let deliveryQueue = 0;
  let codPending = 0;
  let todaysTasks = 0;

  for (const order of orders) {
    const status = String(order.status ?? '').toLowerCase();
    if (
      status === ORDER_STATUS.ORDER_ACCEPTED ||
      status === ORDER_STATUS.SEARCHING_TAILOR ||
      status === ORDER_STATUS.BROADCASTED
    ) {
      assigned += 1;
    }
    if (status === ORDER_STATUS.PICKUP_SCHEDULED || status === ORDER_STATUS.PICKUP_PENDING) {
      pickupQueue += 1;
      if (isToday(order.scheduled_pickup_at)) todaysTasks += 1;
    }
    if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
      deliveryQueue += 1;
      todaysTasks += 1;
      if (typeof order.remaining_amount === 'number' && order.remaining_amount > 0) {
        codPending += 1;
      }
    }
  }

  return { assigned, pickupQueue, deliveryQueue, codPending, todaysTasks };
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
    // TAILOR_ASSIGNED - order is with this tailor but the cloth hasn't
    // physically arrived yet (Bridge hasn't handed it over) - still real,
    // currently-relevant work, so it belongs in "Assigned" alongside
    // CLOTH_RECEIVED_BY_TAILOR rather than falling through uncounted.
    if (
      order.status === ORDER_STATUS.TAILOR_ASSIGNED ||
      order.status === ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR
    ) {
      assigned += 1;
    } else if (STITCHING_STATUSES.has(order.status)) {
      stitching += 1;
    } else if (order.status === ORDER_STATUS.READY_FOR_DISPATCH) {
      ready += 1;
    } else if (
      order.status === ORDER_STATUS.COMPLETED ||
      order.status === ORDER_STATUS.DELIVERED
    ) {
      // DELIVERED and COMPLETED are both "done" from the tailor's
      // perspective (their stitching work is finished either way) -
      // previously only COMPLETED counted, so a DELIVERED order was
      // invisible on the dashboard until some later transition to
      // COMPLETED.
      completed += 1;
    }
  }

  return { assigned, stitching, ready, completed };
};
