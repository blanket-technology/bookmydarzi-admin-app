import { useMemo } from 'react';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import type { UserRole } from '@/types/auth';
import { computeOrderRules, type RuleActionId } from '@/features/orders/orderRules';
import type { AdminOrderItem } from '@/types/orders';
import {
  useAcceptOrderMutation,
  useAssignTailorMutation,
  useCancelOrderMutation,
  useCollectPaymentMutation,
  useCompleteOrderMutation,
  useCompleteRepairMutation,
  useConfirmPickupMutation,
  useHandToTailorMutation,
  useRefuseDeliveryMutation,
  useRejectOrderMutation,
  useSchedulePickupMutation,
  useUpdateOrderStatusMutation,
  useUpdateStitchingStatusMutation,
} from '@/features/orders/hooks/useOrders';
import { useBackOutPickupBroadcastMutation } from '@/features/pickups/hooks/usePickups';
import { useBackOutDeliveryBroadcastMutation } from '@/features/deliveries/hooks/useDeliveries';

export type OrderActionId = RuleActionId;

export interface OrderAction {
  id: OrderActionId;
  label: string;
  /** 'primary' surfaces prominently; 'secondary' is a lower-emphasis action; 'destructive' warns. */
  tone: 'primary' | 'secondary' | 'destructive';
  /** True when this action opens a form/sheet rather than firing immediately. */
  requiresInput: boolean;
  /** True when the action should be confirmed before firing (irreversible/high-stakes). */
  requiresConfirmation: boolean;
  isLoading: boolean;
  /** Executes the action. For requiresInput actions, callers collect the payload themselves. */
  run: () => void;
  /** When set the action renders disabled (not omitted) with this explanation. */
  disabledReason?: string;
}

interface UseOrderActionsArgs {
  role: UserRole | string | null | undefined;
  /** The signed-in user's id: an employee may only act on the legs they hold. */
  userId?: string | number | null;
  order: Pick<
    AdminOrderItem,
    | 'order_id'
    | 'status'
    | 'tailor_id'
    | 'remaining_amount'
    | 'payment_status'
    | 'customer_id'
    | 'assigned_employee_id'
    | 'delivery_employee_id'
  > | null
    | undefined;
}

interface UseOrderActionsResult {
  actions: OrderAction[];
  isCodCollectionRequired: boolean;
  /** May record measurements right now (stage- and role-aware). */
  canEditMeasurements: boolean;
  /** May add an extra service right now (stage- and role-aware). */
  canAddAddons: boolean;
}

/**
 * Turns the role x stage rule table (orderRules.ts, unit-tested) into the
 * actions an order screen renders, wiring each one to its mutation. All
 * "should this button exist" decisions live in orderRules.ts, not here.
 */
export function useOrderActions({ role, userId, order }: UseOrderActionsArgs): UseOrderActionsResult {
  const { t } = useAppLanguage();
  const acceptMutation = useAcceptOrderMutation();
  const rejectMutation = useRejectOrderMutation();
  const confirmPickupMutation = useConfirmPickupMutation();
  const handToTailorMutation = useHandToTailorMutation();
  const completeMutation = useCompleteOrderMutation();
  const refuseDeliveryMutation = useRefuseDeliveryMutation();
  const collectPaymentMutation = useCollectPaymentMutation();
  const assignTailorMutation = useAssignTailorMutation();
  const cancelMutation = useCancelOrderMutation();
  const schedulePickupMutation = useSchedulePickupMutation();
  // PATCH /orders/{id}/status is TAILOR-only server-side; staff use PATCH /admin/orders/{id}/status.
  const tailorStitchingMutation = useUpdateStitchingStatusMutation();
  const staffStitchingMutation = useUpdateOrderStatusMutation();
  const completeRepairMutation = useCompleteRepairMutation();
  const backOutPickupMutation = useBackOutPickupBroadcastMutation();
  const backOutDeliveryMutation = useBackOutDeliveryBroadcastMutation();

  const isTailor = String(role ?? '').toLowerCase() === 'tailor';
  const orderId = order?.order_id;

  return useMemo<UseOrderActionsResult>(() => {
    if (!order || !orderId) {
      return { actions: [], isCodCollectionRequired: false, canEditMeasurements: false, canAddAddons: false };
    }
    const rules = computeOrderRules({ role, userId, order });
    const stitching = isTailor ? tailorStitchingMutation : staffStitchingMutation;

    const loading: Partial<Record<OrderActionId, boolean>> = {
      accept: acceptMutation.isPending,
      reject: rejectMutation.isPending,
      schedule_pickup: schedulePickupMutation.isPending,
      confirm_pickup: confirmPickupMutation.isPending,
      hand_to_tailor: handToTailorMutation.isPending,
      complete: completeMutation.isPending,
      refuse_delivery: refuseDeliveryMutation.isPending,
      collect_cod: collectPaymentMutation.isPending,
      assign_tailor: assignTailorMutation.isPending,
      cancel: cancelMutation.isPending,
      complete_repair: completeRepairMutation.isPending,
      stitching_started: stitching.isPending,
      in_progress: stitching.isPending,
      final_check: stitching.isPending,
      ready_for_dispatch: stitching.isPending,
      back_out_pickup: backOutPickupMutation.isPending,
      back_out_delivery: backOutDeliveryMutation.isPending,
    };

    // Direct (one-tap) actions. Anything that needs input opens a sheet in the
    // screen, which then calls the mutation itself.
    const run: Partial<Record<OrderActionId, () => void>> = {
      accept: () => acceptMutation.mutate({ orderId, payload: undefined }),
      confirm_pickup: () => confirmPickupMutation.mutate({ orderId, payload: undefined }),
      hand_to_tailor: () => handToTailorMutation.mutate({ orderId, payload: undefined }),
      complete: () => completeMutation.mutate({ orderId, payload: undefined }),
      complete_repair: () => completeRepairMutation.mutate({ orderId: String(orderId) }),
      stitching_started: () => stitching.mutate({ orderId, payload: { status: 'stitching_started' } }),
      in_progress: () => stitching.mutate({ orderId, payload: { status: 'in_progress' } }),
      final_check: () => stitching.mutate({ orderId, payload: { status: 'final_check' } }),
      ready_for_dispatch: () => stitching.mutate({ orderId, payload: { status: 'ready_for_dispatch' } }),
    };

    const actions: OrderAction[] = rules.actions.map((rule) => ({
      id: rule.id,
      label: t(`orderActions.${rule.label}`),
      tone: rule.tone,
      requiresInput: rule.requiresInput,
      requiresConfirmation: rule.requiresConfirmation,
      isLoading: !!loading[rule.id],
      run: run[rule.id] ?? (() => undefined),
      disabledReason: rule.disabledReason ? t(`orderActions.${rule.disabledReason}`) : undefined,
    }));

    return {
      actions,
      isCodCollectionRequired: rules.isCodCollectionRequired,
      canEditMeasurements: rules.canEditMeasurements,
      canAddAddons: rules.canAddAddons,
    };
  }, [
    order,
    orderId,
    role,
    userId,
    isTailor,
    t,
    acceptMutation.isPending,
    rejectMutation.isPending,
    schedulePickupMutation.isPending,
    confirmPickupMutation.isPending,
    handToTailorMutation.isPending,
    completeMutation.isPending,
    refuseDeliveryMutation.isPending,
    collectPaymentMutation.isPending,
    assignTailorMutation.isPending,
    cancelMutation.isPending,
    completeRepairMutation.isPending,
    tailorStitchingMutation.isPending,
    staffStitchingMutation.isPending,
    backOutPickupMutation.isPending,
    backOutDeliveryMutation.isPending,
    acceptMutation,
    confirmPickupMutation,
    handToTailorMutation,
    completeMutation,
    completeRepairMutation,
    tailorStitchingMutation,
    staffStitchingMutation,
  ]);
}
