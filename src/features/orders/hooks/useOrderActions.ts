import { useMemo } from 'react';
import { EMPLOYEE_QUEUE_EXCLUDED_STATUSES, ORDER_STATUS } from '@/constants/orderStatus';
import type { UserRole } from '@/types/auth';
import type { AdminOrderItem, OrderStatus } from '@/types/orders';
import {
  useAcceptOrderMutation,
  useAssignTailorMutation,
  useCancelOrderMutation,
  useCollectPaymentMutation,
  useCompleteOrderMutation,
  useConfirmPickupMutation,
  useHandToTailorMutation,
  useRejectOrderMutation,
  useSchedulePickupMutation,
  useUpdateOrderStatusMutation,
  useUpdateStitchingStatusMutation,
} from '@/features/orders/hooks/useOrders';

export type OrderActionId =
  | 'accept'
  | 'reject'
  | 'schedule_pickup'
  | 'confirm_pickup'
  | 'hand_to_tailor'
  | 'stitching_started'
  | 'in_progress'
  | 'final_check'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'collect_cod'
  | 'complete'
  | 'assign_tailor'
  | 'cancel'
  | 'correct_status'
  | 'update_measurement'
  | 'manage_measurement'
  | 'add_addon'
  | 'view_payment';

export interface OrderAction {
  id: OrderActionId;
  label: string;
  /** 'primary' surfaces prominently; 'secondary' is a lower-emphasis action; 'destructive' warns. */
  tone: 'primary' | 'secondary' | 'destructive';
  /** True when this action opens a form/sheet rather than firing immediately. */
  requiresInput: boolean;
  /** True when the action should be confirmed (e.g. an alert) before firing, for irreversible/high-stakes actions. */
  requiresConfirmation: boolean;
  isLoading: boolean;
  /** Executes the action. For requiresInput actions, callers must collect the payload themselves and call the corresponding mutation directly. */
  run: () => void;
  /** When set, the action should render disabled (not omitted) with this
   * explanation visible - mirrors web's disabledReason (orderActions.js),
   * e.g. "Assign a tailor first" for hand_to_tailor, or a balance-due
   * message for complete_order. Distinct from simply not pushing the
   * action at all: the button stays visible so staff understand what's
   * blocking the next step instead of it silently vanishing. */
  disabledReason?: string;
}

interface UseOrderActionsArgs {
  role: UserRole | string | null | undefined;
  order: Pick<
    AdminOrderItem,
    'order_id' | 'status' | 'tailor_id' | 'remaining_amount' | 'payment_status' | 'customer_id' | 'assigned_employee_id'
  > | null
    | undefined;
}

interface UseOrderActionsResult {
  actions: OrderAction[];
  isCodCollectionRequired: boolean;
}

/**
 * Single source of truth for "what can this role do to this order right now."
 * Mirrors the backend's role+status enforcement in
 * app/services/orders/order_status_rules.py and app/api/v1/endpoints/employee.py —
 * this hook only decides whether to SHOW a button; the backend independently
 * re-validates every transition, so nothing here is a security boundary.
 *
 * Add new screens (dashboard cards, list quick-actions, notifications) by
 * calling this hook rather than re-deriving role/status logic locally.
 */
export function useOrderActions({ role, order }: UseOrderActionsArgs): UseOrderActionsResult {
  const acceptMutation = useAcceptOrderMutation();
  const rejectMutation = useRejectOrderMutation();
  const schedulePickupMutation = useSchedulePickupMutation();
  const confirmPickupMutation = useConfirmPickupMutation();
  const handToTailorMutation = useHandToTailorMutation();
  const completeMutation = useCompleteOrderMutation();
  const collectPaymentMutation = useCollectPaymentMutation();
  const assignTailorMutation = useAssignTailorMutation();
  const cancelMutation = useCancelOrderMutation();
  // PATCH /orders/{id}/status (update_status_tailor) is require_roles(TAILOR)
  // ONLY server-side - staff must go through PATCH /admin/orders/{id}/status
  // instead (admin_update_order_status, which now also accepts EMPLOYEE).
  const tailorStitchingMutation = useUpdateStitchingStatusMutation();
  const staffStitchingMutation = useUpdateOrderStatusMutation();

  const normalizedRole = String(role ?? '').toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';
  const isEmployee = normalizedRole === 'employee';
  const isTailor = normalizedRole === 'tailor';
  // Employee endpoints (app/api/v1/endpoints/employee.py) accept admin/superadmin too.
  const canUseEmployeeActions = isEmployee || isAdmin;

  const status = (order?.status ?? '') as OrderStatus;
  const orderId = order?.order_id;
  const remainingAmount = order?.remaining_amount ?? 0;
  const isCodCollectionRequired = remainingAmount > 0 && status === ORDER_STATUS.OUT_FOR_DELIVERY;

  // Mirrors web's TERMINAL_STATUSES early-return (orderActions.js:97-99) -
  // no role gets any action on a completed/cancelled/rejected order.
  // Previously only `cancel` and `correct_status` checked a terminal set
  // client-side here, so assign_tailor/update_measurement/view_payment
  // still rendered (and stayed clickable) on terminal orders.
  const terminalStatuses = useMemo(
    () =>
      new Set<OrderStatus>([
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
      ]),
    [],
  );
  const isTerminal = terminalStatuses.has(status);

  const actions = useMemo<OrderAction[]>(() => {
    if (!orderId || isTerminal) return [];
    const list: OrderAction[] = [];

    if (canUseEmployeeActions) {
      if (status === ORDER_STATUS.ORDER_PLACED) {
        list.push({
          id: 'accept',
          label: 'Accept Order',
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: acceptMutation.isPending,
          run: () => acceptMutation.mutate({ orderId, payload: undefined }),
        });
        list.push({
          id: 'reject',
          label: 'Reject Order',
          tone: 'destructive',
          requiresInput: true,
          requiresConfirmation: true,
          isLoading: rejectMutation.isPending,
          run: () => rejectMutation.mutate({ orderId, payload: undefined }),
        });
      } else if (
        // A pickup can still be manually acquired after the order has moved
        // past order_placed while the tailor is being searched, as long as no
        // employee has claimed it yet. The backend /accept endpoint allows any
        // non-terminal status and only blocks if it's assigned to someone else
        // (employee_order_service.accept), so this mirrors that. Lets a Bridge
        // grab an unclaimed pickup instead of waiting for a broadcast offer.
        !order?.assigned_employee_id &&
        (status === ORDER_STATUS.SEARCHING_TAILOR ||
          status === ORDER_STATUS.BROADCASTED ||
          status === ORDER_STATUS.TAILOR_ASSIGNED)
      ) {
        list.push({
          id: 'accept',
          label: 'Acquire for Pickup',
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: acceptMutation.isPending,
          run: () => acceptMutation.mutate({ orderId, payload: undefined }),
        });
      }

      // Also offered from TAILOR_ASSIGNED, matching web (orderActions.js
      // lines 122-173) - schedule_pickup_employee_order accepts both
      // statuses server-side, since a tailor can be found before pickup was
      // ever scheduled at order_accepted time. Previously mobile only
      // checked ORDER_ACCEPTED, so an order that reached TAILOR_ASSIGNED
      // without a scheduled pickup had no way to trigger one from here.
      if (status === ORDER_STATUS.ORDER_ACCEPTED || status === ORDER_STATUS.TAILOR_ASSIGNED) {
        list.push({
          id: 'schedule_pickup',
          label: 'Schedule Pickup',
          tone: 'primary',
          requiresInput: true,
          requiresConfirmation: false,
          isLoading: schedulePickupMutation.isPending,
          run: () => {
            // Caller opens SchedulePickupSheet to choose instant vs
            // scheduled (+ date/time slot for scheduled) - see [id].tsx.
          },
        });
      }

      if (status === ORDER_STATUS.PICKUP_SCHEDULED || status === ORDER_STATUS.PICKUP_PENDING) {
        list.push({
          id: 'confirm_pickup',
          label: 'Confirm Pickup',
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: confirmPickupMutation.isPending,
          run: () => confirmPickupMutation.mutate({ orderId, payload: undefined }),
        });
      }

      if (status === ORDER_STATUS.PICKED_UP) {
        list.push({
          id: 'hand_to_tailor',
          label: 'Hand to Tailor',
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: handToTailorMutation.isPending,
          run: () => handToTailorMutation.mutate({ orderId, payload: undefined }),
          // Matches web (orderActions.js:197) - previously this button was
          // just enabled unconditionally even with no tailor on the order,
          // so tapping it would fail server-side with no explanation of why.
          disabledReason: !order?.tailor_id ? 'Assign a tailor first' : undefined,
        });
      }

      // No manual "Out for Delivery" action here — PATCH /employee/orders/
      // {id}/delivery is deprecated server-side and unconditionally 400s
      // (employee_order_service.py). Once an order reaches
      // READY_FOR_DISPATCH it becomes a delivery-broadcast candidate
      // automatically; the employee claims it via Accept on the Deliveries
      // screen (see (drawer)/deliveries/index.tsx), not a button here.

      if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
        if (isCodCollectionRequired) {
          list.push({
            id: 'collect_cod',
            label: 'Collect COD',
            tone: 'primary',
            requiresInput: true,
            requiresConfirmation: false,
            isLoading: collectPaymentMutation.isPending,
            run: () => {
              // Caller supplies { method, amount, notes } — see CollectPaymentSheet.
            },
          });
        } else {
          list.push({
            id: 'complete',
            label: 'Complete Order',
            tone: 'primary',
            requiresInput: false,
            requiresConfirmation: true,
            isLoading: completeMutation.isPending,
            run: () => completeMutation.mutate({ orderId, payload: undefined }),
          });
        }
      }

      // No action from DELIVERED: complete_employee_order (employee_order_service.py)
      // only ever transitions OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED in a
      // single call, and DELIVERED is itself in EMPLOYEE_QUEUE_EXCLUDED
      // (employee_orders.py) — an employee has no valid action to take once
      // an order reaches DELIVERED, it's already terminal from their side.

      // Employee-only measurement collection at pickup — mirrors backend's
      // assert_employee_order_claimed / assert_can_view_employee_order gate
      // (any non-excluded status, while assigned to this employee). Admins
      // use the separate 'update_measurement' admin-only endpoint/action
      // instead, so this is deliberately isEmployee-only to avoid a
      // duplicate button on the same screen for admin viewers.
      if (isEmployee && !EMPLOYEE_QUEUE_EXCLUDED_STATUSES.has(status)) {
        list.push({
          id: 'manage_measurement',
          label: 'Update Measurement',
          tone: 'secondary',
          requiresInput: true,
          requiresConfirmation: false,
          isLoading: false,
          run: () => {
            // Opens the measurement management sheet (view saved profiles,
            // pick one, or add new) — see MeasurementManageSheet.
          },
        });

        // Same gate as manage_measurement above (any non-excluded status,
        // while assigned to this employee) - the natural moment to notice
        // "customer also wants a button fixed" is the same pickup visit
        // where measurements are collected. See AddOrderAddonSheet /
        // POST /employee/orders/{id}/addons.
        list.push({
          id: 'add_addon',
          label: 'Add Extra Service',
          tone: 'secondary',
          requiresInput: true,
          requiresConfirmation: false,
          isLoading: false,
          run: () => {
            // Opens AddOrderAddonSheet.
          },
        });
      }

      // Tailor assignment and payment viewing, employee-only here (isAdmin
      // already gets its own unconditional versions of both below - this
      // block must not also fire for admin, since canUseEmployeeActions is
      // isEmployee || isAdmin and would otherwise push duplicate actions).
      if (isEmployee) {
        // PATCH /employee/orders/{id}/assign-tailor - requires the order
        // claimed by this employee and a measurement to already exist;
        // distinct precondition from admin's unrestricted
        // /admin/orders/{id}/assign-tailor route.
        if (!order?.tailor_id) {
          list.push({
            id: 'assign_tailor',
            label: 'Assign Tailor',
            tone: 'secondary',
            requiresInput: true,
            requiresConfirmation: false,
            isLoading: false,
            run: () => {
              // Caller supplies { tailor_id } — see AssignTailorSheet.
            },
          });
        }

        // Read-only, already permitted for employees server-side
        // (ADMIN_STAFF_ROLES includes EMPLOYEE in get_payment_by_order /
        // get_refunds_for_payment).
        list.push({
          id: 'view_payment',
          label: 'View Payment',
          tone: 'secondary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: false,
          run: () => {
            // Navigates to / expands the payment detail section.
          },
        });
      }
    }

    // Staff (admin/superadmin/employee) can drive every stitching stage
    // themselves once a tailor is assigned, not just the tailor —
    // order_status_rules.py's ADMIN_STAFF_ROLES bypass (which includes
    // EMPLOYEE) and admin.py's admin_update_order_status (now accepting
    // EMPLOYEE too) already allow this server-side; this was previously
    // tailor-only client-side with no equivalent staff action at all.
    if (isTailor || canUseEmployeeActions) {
      // Server enforces strict sequential progression for tailors
      // (order_status_rules.py); staff bypass that graph entirely, but the
      // UI still only ever offers the immediate next stage to keep the
      // workflow linear and predictable.
      const stitchingStageFor: Partial<Record<OrderStatus, OrderStatus>> = {
        [ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR]: ORDER_STATUS.STITCHING_STARTED,
        [ORDER_STATUS.STITCHING_STARTED]: ORDER_STATUS.IN_PROGRESS,
        [ORDER_STATUS.IN_PROGRESS]: ORDER_STATUS.FINAL_CHECK,
        [ORDER_STATUS.FINAL_CHECK]: ORDER_STATUS.READY_FOR_DISPATCH,
      };
      const stitchingLabels: Record<string, string> = {
        [ORDER_STATUS.STITCHING_STARTED]: 'Start Stitching',
        [ORDER_STATUS.IN_PROGRESS]: 'Update Progress',
        [ORDER_STATUS.FINAL_CHECK]: 'Send for Final Check',
        [ORDER_STATUS.READY_FOR_DISPATCH]: 'Ready for Dispatch',
      };
      const nextStage = stitchingStageFor[status];
      if (nextStage) {
        const mutation = isTailor ? tailorStitchingMutation : staffStitchingMutation;
        // Only "Update Progress" (STITCHING_STARTED -> IN_PROGRESS) opens
        // UpdateProgressSheet to optionally attach a photo - asking again at
        // "Send for Final Check" would prompt the tailor for a photo twice
        // in a row for the same garment, which is exactly the confusing
        // double-ask the sheet was meant to avoid. Only meaningful for the
        // tailor (photo upload is require_roles(TAILOR) server-side, see
        // orders.py's upload_order_photo). Staff and every other transition
        // stay a direct one-tap action, unchanged.
        const opensProgressSheet = isTailor && nextStage === ORDER_STATUS.IN_PROGRESS;
        list.push({
          id: nextStage as OrderActionId,
          label: stitchingLabels[nextStage] ?? nextStage,
          tone: 'primary',
          requiresInput: opensProgressSheet,
          requiresConfirmation: false,
          isLoading: mutation.isPending,
          run: opensProgressSheet
            ? () => {
                // Caller opens UpdateProgressSheet, which uploads any picked
                // photo then calls this same mutation itself.
              }
            : () => mutation.mutate({ orderId, payload: { status: nextStage } }),
        });
      }
    }

    if (isAdmin) {
      // Only offer assignment while no tailor is on the order yet - this
      // was previously pushed unconditionally, so "Assign Tailor" kept
      // showing (and stayed clickable) even after a tailor was already
      // assigned, right alongside whatever action should follow it.
      // Also excludes pending_payment/payment_failed, matching web
      // (orderActions.js:293-297) - assigning a tailor before payment even
      // succeeds doesn't make sense and the order may never proceed.
      if (
        !order?.tailor_id &&
        status !== ORDER_STATUS.PENDING_PAYMENT &&
        status !== ORDER_STATUS.PAYMENT_FAILED
      ) {
        list.push({
          id: 'assign_tailor',
          label: 'Assign Tailor',
          tone: 'secondary',
          requiresInput: true,
          requiresConfirmation: false,
          isLoading: assignTailorMutation.isPending,
          run: () => {
            // Caller supplies { tailor_id } — see AssignTailorSheet.
          },
        });
      }

      list.push({
        id: 'update_measurement',
        label: 'Update Measurement',
        tone: 'secondary',
        requiresInput: true,
        requiresConfirmation: false,
        isLoading: false,
        run: () => {
          // Opens the measurement form sheet.
        },
      });

      list.push({
        id: 'view_payment',
        label: 'View Payment',
        tone: 'secondary',
        requiresInput: false,
        requiresConfirmation: false,
        isLoading: false,
        run: () => {
          // Navigates to / expands the payment detail section.
        },
      });

      // No terminal-status check needed here - the whole hook already
      // returns [] up front for completed/cancelled/rejected orders.
      list.push({
        id: 'cancel',
        label: 'Cancel Order',
        tone: 'destructive',
        requiresInput: true,
        requiresConfirmation: true,
        isLoading: cancelMutation.isPending,
        run: () => {
          // Caller supplies { reason } — see CancelOrderSheet.
        },
      });

      list.push({
        id: 'correct_status',
        label: 'Correct Status',
        tone: 'secondary',
        requiresInput: true,
        requiresConfirmation: true,
        isLoading: false,
        run: () => {
          // Opens ADMIN_CORRECTABLE_STATUS_OPTIONS picker.
        },
      });
    }

    return list;
  }, [
    orderId,
    order,
    status,
    isTerminal,
    canUseEmployeeActions,
    isTailor,
    isAdmin,
    isCodCollectionRequired,
    acceptMutation,
    rejectMutation,
    schedulePickupMutation,
    confirmPickupMutation,
    handToTailorMutation,
    completeMutation,
    collectPaymentMutation,
    tailorStitchingMutation,
    staffStitchingMutation,
    assignTailorMutation,
    cancelMutation,
  ]);

  return { actions, isCodCollectionRequired };
}
