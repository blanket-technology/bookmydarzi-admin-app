import type { OrderStatus } from '@/types/orders';

/**
 * Customer-order lifecycle as one ordered list of phases, shared by the order
 * stepper, the tailor queue tabs and the "what happens next" hints so every
 * screen describes progress the same way. Mirrors the backend lifecycle in
 * app/constants/order_status.py (placed -> tailor -> pickup -> stitching ->
 * delivery -> done).
 */
export interface WorkflowPhase {
  key: 'placed' | 'tailor' | 'pickup' | 'stitching' | 'delivery' | 'done';
  label: string;
  statuses: string[];
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  { key: 'placed', label: 'Placed', statuses: ['pending_payment', 'order_placed', 'order_accepted'] },
  { key: 'tailor', label: 'Tailor', statuses: ['searching_tailor', 'broadcasted', 'tailor_assigned'] },
  { key: 'pickup', label: 'Pickup', statuses: ['pickup_scheduled', 'pickup_pending', 'picked_up', 'cloth_received_by_tailor'] },
  { key: 'stitching', label: 'Stitching', statuses: ['stitching_started', 'in_progress', 'final_check'] },
  { key: 'delivery', label: 'Delivery', statuses: ['ready_for_dispatch', 'out_for_delivery'] },
  {
    key: 'done',
    label: 'Done',
    statuses: [
      'delivered',
      'inspection_window',
      'in_repair',
      'repair_pickup_pending',
      'repair_pickup_scheduled',
      'repair_pickup_in_transit',
      'at_tailor_for_repair',
      'repair_completed',
      'repair_delivery_pending',
      'repair_delivery_scheduled',
      'repair_delivery_in_transit',
      'completed',
    ],
  },
];

/** Statuses that sit outside the happy path (shown as a banner, not a stepper). */
export const OFF_PATH_STATUSES = new Set<string>([
  'payment_failed',
  'order_rejected',
  'cancelled',
  'delivery_refused',
  'return_pending',
  'return_scheduled',
  'return_in_transit',
  'returned',
]);

/** Index of the phase the order is currently in, or -1 when off the happy path. */
export const workflowPhaseIndex = (status: OrderStatus | string | undefined | null): number => {
  if (!status) return -1;
  return WORKFLOW_PHASES.findIndex((phase) => phase.statuses.includes(String(status)));
};

export type TailorBucket = 'todo' | 'stitching' | 'ready' | 'done';

export const TAILOR_BUCKETS: { key: TailorBucket; label: string }[] = [
  { key: 'todo', label: 'To start' },
  { key: 'stitching', label: 'Stitching' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Done' },
];

/** Groups a status into the four queues a tailor actually thinks in. */
export const tailorBucket = (status: OrderStatus | string | undefined | null): TailorBucket => {
  const s = String(status ?? '');
  if (['stitching_started', 'in_progress', 'final_check'].includes(s)) return 'stitching';
  if (['ready_for_dispatch', 'out_for_delivery'].includes(s)) return 'ready';
  if (
    [
      'delivered',
      'completed',
      'cancelled',
      'order_rejected',
      'returned',
      'return_pending',
      'return_scheduled',
      'return_in_transit',
      'inspection_window',
      'in_repair',
    ].includes(s)
  ) {
    return 'done';
  }
  return 'todo';
};

/**
 * One-line, role-aware "what is happening / what do I do" hint for an order
 * row. Returns null when there is nothing useful to add.
 */
export const orderNextStepHint = (
  role: string,
  status: OrderStatus | string | undefined | null,
): string | null => {
  const s = String(status ?? '');
  if (role === 'tailor') {
    switch (s) {
      case 'tailor_assigned':
      case 'pickup_scheduled':
      case 'pickup_pending':
        return 'Waiting for the bridge to collect the cloth';
      case 'picked_up':
        return 'Cloth is on its way to you';
      case 'cloth_received_by_tailor':
        return 'Start stitching';
      case 'stitching_started':
      case 'in_progress':
        return 'Update progress as you go';
      case 'final_check':
        return 'Finish the final check, then mark ready';
      case 'ready_for_dispatch':
        return 'Waiting for the bridge to deliver';
      default:
        return null;
    }
  }
  if (role === 'employee') {
    switch (s) {
      case 'pickup_scheduled':
      case 'pickup_pending':
        return 'Pick up the cloth from the customer';
      case 'picked_up':
        return 'Hand the cloth to the tailor';
      case 'ready_for_dispatch':
        return 'Collect from the tailor and deliver';
      case 'out_for_delivery':
        return 'Deliver and collect any balance';
      default:
        return null;
    }
  }
  return null;
};
