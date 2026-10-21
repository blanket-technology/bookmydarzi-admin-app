/**
 * The single source of truth for "who may do what, at which stage" on an order.
 *
 * Pure (no React, no i18n) so the whole role x stage matrix is unit-tested. The
 * backend remains the authority (it re-validates every transition); this table
 * decides what the app OFFERS, and it offers only what makes sense at that point
 * of the real workflow, not everything the backend happens to tolerate:
 *
 *   placed -> accepted -> tailor found -> pickup scheduled -> picked up
 *     -> cloth with tailor -> stitching (3 steps) -> ready for dispatch
 *     -> out for delivery -> delivered (inspection window) -> completed
 *
 * Roles:
 *   tailor    : drives the stitching steps only.
 *   employee  : "Bridge". Pickup leg (claim, schedule, confirm pickup, record
 *               measurements/add-ons, hand to tailor) and delivery leg (collect
 *               payment, mark delivered). Acts only on legs they hold.
 *   admin / superadmin : oversight - assigns, corrects and can drive any step.
 */

export type RuleActionId =
  | 'accept'
  | 'reject'
  | 'schedule_pickup'
  | 'confirm_pickup'
  | 'hand_to_tailor'
  | 'stitching_started'
  | 'in_progress'
  | 'final_check'
  | 'ready_for_dispatch'
  | 'collect_cod'
  | 'complete'
  | 'refuse_delivery'
  | 'assign_tailor'
  | 'complete_repair'
  | 'cancel'
  | 'correct_status'
  | 'update_measurement'
  | 'manage_measurement'
  | 'add_addon'
  | 'view_payment'
  | 'back_out_pickup'
  | 'back_out_delivery';

export type RuleTone = 'primary' | 'secondary' | 'destructive';

export interface RuleAction {
  id: RuleActionId;
  tone: RuleTone;
  /** i18n key suffix under orderActions.* to use as the label. */
  label: string;
  requiresInput: boolean;
  requiresConfirmation: boolean;
  /** i18n key suffix under orderActions.* explaining why the action is blocked. */
  disabledReason?: 'needTailor' | 'needBridge';
}

export interface RuleOrder {
  status: string;
  tailor_id?: string | number | null;
  assigned_employee_id?: string | number | null;
  delivery_employee_id?: string | number | null;
  remaining_amount?: number | null;
}

export interface RuleContext {
  role: string | null | undefined;
  userId: string | number | null | undefined;
  order: RuleOrder;
}

export interface OrderRules {
  actions: RuleAction[];
  /** May record / change the garment measurements right now. */
  canEditMeasurements: boolean;
  /** May add an extra service (add-on) right now. */
  canAddAddons: boolean;
  /** The customer still owes money that must be collected at the door. */
  isCodCollectionRequired: boolean;
}

// --------------------------------------------------------------------------- stages

const TERMINAL = new Set(['completed', 'cancelled', 'order_rejected']);

/** Awaiting a tailor (accepted, being broadcast, or just assigned). */
const FINDING_TAILOR = new Set(['order_accepted', 'searching_tailor', 'broadcasted']);

/** Pickup leg: scheduled -> picked up (cloth is with the bridge). */
const PICKUP_LEG = new Set(['pickup_scheduled', 'pickup_pending', 'picked_up']);

/** Garment is still being collected: measurements and add-ons can still be recorded. */
const MEASURE_WINDOW_EMPLOYEE = PICKUP_LEG;

/** Admin may still correct measurements until stitching begins. */
const MEASURE_WINDOW_ADMIN = new Set([
  'order_placed',
  'order_accepted',
  'searching_tailor',
  'broadcasted',
  'tailor_assigned',
  'pickup_scheduled',
  'pickup_pending',
  'picked_up',
  'cloth_received_by_tailor',
]);

/** Mirrors the backend cancel block-list (cancellation_service._cancel_order_core). */
const CANCEL_BLOCKED = new Set([
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
  'delivery_refused',
  'return_pending',
  'return_scheduled',
  'return_in_transit',
  'returned',
]);

const NEXT_STITCHING_STAGE: Record<string, 'stitching_started' | 'in_progress' | 'final_check' | 'ready_for_dispatch'> = {
  cloth_received_by_tailor: 'stitching_started',
  stitching_started: 'in_progress',
  in_progress: 'final_check',
  final_check: 'ready_for_dispatch',
};

const same = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) !== '' && String(a) === String(b);

// --------------------------------------------------------------------------- rules

export function computeOrderRules({ role, userId, order }: RuleContext): OrderRules {
  const r = String(role ?? '').toLowerCase();
  const isAdmin = r === 'admin' || r === 'superadmin';
  const isEmployee = r === 'employee';
  const isTailor = r === 'tailor';
  const status = String(order.status ?? '');

  const remaining = order.remaining_amount ?? 0;
  const isCodCollectionRequired = remaining > 0 && status === 'out_for_delivery';

  const actions: RuleAction[] = [];
  const result = (): OrderRules => ({
    actions,
    canEditMeasurements: false,
    canAddAddons: false,
    isCodCollectionRequired,
  });

  const add = (a: Omit<RuleAction, 'requiresInput' | 'requiresConfirmation'> & Partial<Pick<RuleAction, 'requiresInput' | 'requiresConfirmation'>>) =>
    actions.push({ requiresInput: false, requiresConfirmation: false, ...a });

  if (!isAdmin && !isEmployee && !isTailor) return result();

  const isTerminal = TERMINAL.has(status);

  // Read-only payment view is useful to admin on any order, finished or not.
  const adminViewPayment = () => add({ id: 'view_payment', tone: 'secondary', label: 'viewPayment' });

  if (isTerminal) {
    if (isAdmin) adminViewPayment();
    return result();
  }

  // ------------------------------------------------------------------ tailor
  if (isTailor) {
    if (status === 'at_tailor_for_repair') {
      add({ id: 'complete_repair', tone: 'primary', label: 'completeRepair' });
    }
    const next = NEXT_STITCHING_STAGE[status];
    if (next) {
      add({
        id: next,
        tone: 'primary',
        label: STITCH_LABEL[next],
        // "Update progress" lets the tailor attach an optional photo.
        requiresInput: next === 'in_progress',
      });
    }
    return result();
  }

  // ---------------------------------------------------------------- employee
  const myPickupLeg = same(order.assigned_employee_id, userId);
  const unclaimed = !order.assigned_employee_id;
  const assignedToOther = !!order.assigned_employee_id && !myPickupLeg;
  const myDeliveryLeg = same(order.delivery_employee_id, userId);

  const pickupLegActor = isAdmin || myPickupLeg;
  const canClaim = isAdmin || unclaimed; // may take the pickup leg

  // Claim / accept (pickup leg). Admin acquires on its own behalf as a fallback.
  if (status === 'order_placed' && (isAdmin || unclaimed)) {
    add({ id: 'accept', tone: 'primary', label: 'accept' });
    add({ id: 'reject', tone: 'destructive', label: 'reject', requiresInput: true, requiresConfirmation: true });
  } else if (
    (FINDING_TAILOR.has(status) || status === 'tailor_assigned') &&
    canClaim &&
    !order.assigned_employee_id
  ) {
    add({ id: 'accept', tone: 'primary', label: 'acquirePickup' });
  }

  // Assigning a tailor: admin always (while none is set); a bridge only on a leg they hold.
  if (
    !order.tailor_id &&
    status !== 'pending_payment' &&
    status !== 'payment_failed' &&
    (isAdmin || (isEmployee && myPickupLeg))
  ) {
    add({ id: 'assign_tailor', tone: 'secondary', label: 'assignTailor', requiresInput: true });
  }

  if (pickupLegActor && !assignedToOther) {
    if (status === 'order_accepted' || status === 'tailor_assigned') {
      add({ id: 'schedule_pickup', tone: 'primary', label: 'schedulePickup', requiresInput: true });
    }
    if (status === 'pickup_scheduled' || status === 'pickup_pending') {
      add({
        id: 'confirm_pickup',
        tone: 'primary',
        label: 'confirmPickup',
        disabledReason: order.assigned_employee_id ? undefined : 'needBridge',
      });
    }
    if (status === 'picked_up') {
      add({
        id: 'hand_to_tailor',
        tone: 'primary',
        label: 'handToTailor',
        disabledReason: !order.tailor_id ? 'needTailor' : order.assigned_employee_id ? undefined : 'needBridge',
      });
    }
    // Back out of an already-accepted pickup (vehicle breakdown, blocked
    // road, can't reach the location) - only an employee who holds the
    // leg may back out of it, and only before the garment is physically
    // picked up (matches employee_back_out_pickup_broadcast's own
    // ORDER_ACCEPTED-only guard in pickup_broadcast_service.py). Not
    // offered to admin - this is the assigned partner's own "I can't do
    // this" action, not an oversight lever.
    if (status === 'order_accepted' && isEmployee && myPickupLeg) {
      add({ id: 'back_out_pickup', tone: 'destructive', label: 'backOutPickup', requiresInput: true });
    }
  }

  // Measurements and add-ons: only while the garment is still being collected.
  const canEditMeasurements =
    (isEmployee && myPickupLeg && MEASURE_WINDOW_EMPLOYEE.has(status)) ||
    (isAdmin && MEASURE_WINDOW_ADMIN.has(status));
  const canAddAddons = isEmployee && myPickupLeg && PICKUP_LEG.has(status);

  if (canEditMeasurements) {
    add({
      id: isAdmin ? 'update_measurement' : 'manage_measurement',
      tone: 'secondary',
      label: 'updateMeasurement',
      requiresInput: true,
    });
  }
  if (canAddAddons) {
    add({ id: 'add_addon', tone: 'secondary', label: 'addExtraService', requiresInput: true });
  }

  // Stitching steps: admin can drive them (override); a bridge never does.
  if (isAdmin) {
    const next = NEXT_STITCHING_STAGE[status];
    if (next) add({ id: next, tone: 'primary', label: STITCH_LABEL[next] });
  }

  // Delivery leg: only the employee who holds it (admin overrides).
  if (status === 'out_for_delivery' && (isAdmin || myDeliveryLeg)) {
    if (isCodCollectionRequired) {
      add({ id: 'collect_cod', tone: 'primary', label: 'collectAndDeliver', requiresInput: true });
    } else {
      add({ id: 'complete', tone: 'primary', label: 'markDelivered', requiresConfirmation: true });
    }
    add({
      id: 'refuse_delivery',
      tone: 'destructive',
      label: 'refuseDelivery',
      requiresInput: true,
      requiresConfirmation: true,
    });
    // Same back-out escape hatch as the pickup leg above, for the
    // employee actually holding this delivery (not admin - oversight
    // reassignment is a separate, existing lever).
    if (isEmployee && myDeliveryLeg) {
      add({ id: 'back_out_delivery', tone: 'destructive', label: 'backOutDelivery', requiresInput: true });
    }
  }

  // Payment details: admin always; the delivery bridge while out for delivery.
  if (isAdmin) adminViewPayment();
  else if (isEmployee && myDeliveryLeg && status === 'out_for_delivery') {
    add({ id: 'view_payment', tone: 'secondary', label: 'viewPayment' });
  }

  if (isAdmin) {
    if (!CANCEL_BLOCKED.has(status)) {
      add({ id: 'cancel', tone: 'destructive', label: 'cancelOrder', requiresInput: true, requiresConfirmation: true });
    }
    add({ id: 'correct_status', tone: 'secondary', label: 'correctStatus', requiresInput: true, requiresConfirmation: true });

    // With no tailor on the order, assigning one unblocks everything: lead with it.
    const assign = actions.findIndex((a) => a.id === 'assign_tailor');
    if (assign >= 0 && !order.tailor_id && (FINDING_TAILOR.has(status) || status === 'tailor_assigned')) {
      const [a] = actions.splice(assign, 1);
      a.tone = 'primary';
      for (const other of actions) {
        if (other.id === 'accept' && other.tone === 'primary') other.tone = 'secondary';
        if (other.id === 'schedule_pickup' && other.tone === 'primary') other.tone = 'secondary';
      }
      actions.unshift(a);
    }
  }

  return { actions, canEditMeasurements, canAddAddons, isCodCollectionRequired };
}

const STITCH_LABEL = {
  stitching_started: 'startStitching',
  in_progress: 'updateProgress',
  final_check: 'sendFinalCheck',
  ready_for_dispatch: 'readyForDispatch',
} as const;
