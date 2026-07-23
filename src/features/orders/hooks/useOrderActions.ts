import { useMemo } from 'react';
import { ORDER_STATUS } from '@/constants/orderStatus';
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
  useMarkOutForDeliveryMutation,
  useRejectOrderMutation,
  useSchedulePickupMutation,
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
}

interface UseOrderActionsArgs {
  role: UserRole | string | null | undefined;
  order: Pick<
    AdminOrderItem,
    'order_id' | 'status' | 'tailor_id' | 'remaining_amount' | 'payment_status'
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
  const markOutForDeliveryMutation = useMarkOutForDeliveryMutation();
  const completeMutation = useCompleteOrderMutation();
  const collectPaymentMutation = useCollectPaymentMutation();
  const assignTailorMutation = useAssignTailorMutation();
  const cancelMutation = useCancelOrderMutation();
  const stitchingMutation = useUpdateStitchingStatusMutation();

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

  const actions = useMemo<OrderAction[]>(() => {
    if (!orderId) return [];
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
      }

      if (status === ORDER_STATUS.ORDER_ACCEPTED) {
        list.push({
          id: 'schedule_pickup',
          label: 'Schedule Pickup',
          tone: 'primary',
          requiresInput: true,
          requiresConfirmation: false,
          isLoading: schedulePickupMutation.isPending,
          run: () => schedulePickupMutation.mutate({ orderId, payload: undefined }),
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
        });
      }

      if (status === ORDER_STATUS.READY_FOR_DISPATCH) {
        list.push({
          id: 'out_for_delivery',
          label: 'Out for Delivery',
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: markOutForDeliveryMutation.isPending,
          run: () => markOutForDeliveryMutation.mutate({ orderId, payload: undefined }),
        });
      }

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

      if (status === ORDER_STATUS.DELIVERED) {
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

    if (isTailor) {
      // Server enforces strict sequential progression (order_status_rules.py) —
      // only one next-stage button is ever valid for a given current status.
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
        list.push({
          id: nextStage as OrderActionId,
          label: stitchingLabels[nextStage] ?? nextStage,
          tone: 'primary',
          requiresInput: false,
          requiresConfirmation: false,
          isLoading: stitchingMutation.isPending,
          run: () =>
            stitchingMutation.mutate({ orderId, payload: { status: nextStage } }),
        });
      }
    }

    if (isAdmin) {
      const cancellableStatuses = new Set<OrderStatus>([
        ORDER_STATUS.PENDING_PAYMENT,
        ORDER_STATUS.ORDER_PLACED,
        ORDER_STATUS.ORDER_ACCEPTED,
        ORDER_STATUS.SEARCHING_TAILOR,
        ORDER_STATUS.BROADCASTED,
        ORDER_STATUS.TAILOR_ASSIGNED,
        ORDER_STATUS.PICKUP_SCHEDULED,
        ORDER_STATUS.PICKUP_PENDING,
        ORDER_STATUS.PICKED_UP,
      ]);

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

      if (cancellableStatuses.has(status)) {
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
      }

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
    status,
    canUseEmployeeActions,
    isTailor,
    isAdmin,
    isCodCollectionRequired,
    acceptMutation,
    rejectMutation,
    schedulePickupMutation,
    confirmPickupMutation,
    handToTailorMutation,
    markOutForDeliveryMutation,
    completeMutation,
    collectPaymentMutation,
    stitchingMutation,
    assignTailorMutation,
    cancelMutation,
  ]);

  return { actions, isCodCollectionRequired };
}
