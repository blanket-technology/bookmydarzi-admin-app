import type { AdminOrderItem } from '@/types/orders';

/**
 * "What do I need to do next?" for the field roles, derived from the order list
 * the backend already returns (there is no task endpoint). A task is an order
 * that is in a state where THIS person is the one expected to act.
 */
export type BridgeTaskKind = 'pickup' | 'handover' | 'collect' | 'deliver';

export interface BridgeTask {
  kind: BridgeTaskKind;
  order: AdminOrderItem;
  /** Cash still due from the customer at the door (deliver tasks only). */
  collectAmount: number;
  /** Lower sorts first. */
  priority: number;
}

const sameId = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) !== '' && String(a) === String(b);

const timeOf = (iso?: string): number => {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
};

/** Orders the signed-in bridge employee has claimed and must act on now. */
export const buildBridgeTasks = (
  orders: AdminOrderItem[],
  userId: string | number | null | undefined,
): BridgeTask[] => {
  const tasks: BridgeTask[] = [];
  for (const order of orders) {
    const status = String(order.status ?? '');
    const mineAsPickup = sameId(order.assigned_employee_id, userId);
    const mineAsDelivery = sameId(order.delivery_employee_id, userId);
    const due =
      typeof order.remaining_amount === 'number' && order.remaining_amount > 0 ? order.remaining_amount : 0;

    if (mineAsDelivery && status === 'out_for_delivery') {
      tasks.push({ kind: 'deliver', order, collectAmount: due, priority: 0 });
    } else if (mineAsDelivery && status === 'ready_for_dispatch') {
      tasks.push({ kind: 'collect', order, collectAmount: due, priority: 1 });
    } else if (mineAsPickup && (status === 'pickup_pending' || status === 'pickup_scheduled')) {
      tasks.push({ kind: 'pickup', order, collectAmount: 0, priority: 2 });
    } else if (mineAsPickup && status === 'picked_up') {
      tasks.push({ kind: 'handover', order, collectAmount: 0, priority: 1 });
    }
  }
  return tasks.sort(
    (a, b) =>
      a.priority - b.priority ||
      timeOf(a.order.scheduled_pickup_at ?? a.order.created_at) -
        timeOf(b.order.scheduled_pickup_at ?? b.order.created_at),
  );
};

export interface TailorTask {
  order: AdminOrderItem;
  /** What the tailor should do with it right now. */
  stage: 'start' | 'continue' | 'finish' | 'waiting_pickup' | 'waiting_dispatch';
  priority: number;
}

/** A tailor's open orders ranked by how soon they need the tailor's hands. */
export const buildTailorTasks = (orders: AdminOrderItem[]): TailorTask[] => {
  const tasks: TailorTask[] = [];
  for (const order of orders) {
    const status = String(order.status ?? '');
    if (status === 'cloth_received_by_tailor') tasks.push({ order, stage: 'start', priority: 0 });
    else if (status === 'final_check') tasks.push({ order, stage: 'finish', priority: 1 });
    else if (status === 'stitching_started' || status === 'in_progress')
      tasks.push({ order, stage: 'continue', priority: 2 });
    else if (['tailor_assigned', 'pickup_scheduled', 'pickup_pending', 'picked_up'].includes(status))
      tasks.push({ order, stage: 'waiting_pickup', priority: 4 });
    else if (status === 'ready_for_dispatch') tasks.push({ order, stage: 'waiting_dispatch', priority: 5 });
  }
  return tasks.sort(
    (a, b) =>
      a.priority - b.priority ||
      timeOf(a.order.expected_delivery_date ?? a.order.created_at) -
        timeOf(b.order.expected_delivery_date ?? b.order.created_at),
  );
};
