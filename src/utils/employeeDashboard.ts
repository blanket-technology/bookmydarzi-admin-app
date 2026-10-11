import { ORDER_STATUS } from '@/constants/orderStatus';
import { tailorBucket } from '@/features/orders/workflow';
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

/**
 * Counts use the same grouping as the tailor's Orders tabs (tailorBucket), so a
 * dashboard tile and the list it opens always show the same number:
 *   assigned = "To start", stitching, ready, completed = "Done".
 */
export const computeTailorDashboardStats = (
  orders: AdminOrderItem[],
): TailorDashboardStats => {
  const stats: TailorDashboardStats = { assigned: 0, stitching: 0, ready: 0, completed: 0 };
  for (const order of orders) {
    switch (tailorBucket(order.status)) {
      case 'todo':
        stats.assigned += 1;
        break;
      case 'stitching':
        stats.stitching += 1;
        break;
      case 'ready':
        stats.ready += 1;
        break;
      case 'done':
        stats.completed += 1;
        break;
      default:
        break;
    }
  }
  return stats;
};
