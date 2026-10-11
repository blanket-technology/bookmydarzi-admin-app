import { t } from '@/i18n';
import type { OrderStatus } from '@/types/orders';

/**
 * One-line, role-aware "what is happening / what do I do" hint for an order
 * row. Returns null when there is nothing useful to add.
 */
export interface HintContext {
  /** The viewer holds the pickup leg of this order. */
  myPickup?: boolean;
  /** The viewer holds the delivery leg of this order. */
  myDelivery?: boolean;
}

export const orderNextStepHint = (
  role: string,
  status: OrderStatus | string | undefined | null,
  ctx: HintContext = {},
): string | null => {
  const s = String(status ?? '');
  if (role === 'tailor') {
    switch (s) {
      case 'tailor_assigned':
      case 'pickup_scheduled':
      case 'pickup_pending':
        return t('workflow.hint.tailor.waitingPickup');
      case 'picked_up':
        return t('workflow.hint.tailor.clothComing');
      case 'cloth_received_by_tailor':
        return t('workflow.hint.tailor.start');
      case 'stitching_started':
      case 'in_progress':
        return t('workflow.hint.tailor.inProgress');
      case 'final_check':
        return t('workflow.hint.tailor.finalCheck');
      case 'ready_for_dispatch':
        return t('workflow.hint.tailor.waitingDispatch');
      default:
        return null;
    }
  }
  if (role === 'employee') {
    // Only describe a step the viewer is actually responsible for.
    switch (s) {
      case 'pickup_scheduled':
      case 'pickup_pending':
        return ctx.myPickup ? t('workflow.hint.employee.pickup') : null;
      case 'picked_up':
        return ctx.myPickup ? t('workflow.hint.employee.handover') : null;
      case 'out_for_delivery':
        if (ctx.myDelivery) return t('workflow.hint.employee.deliver');
        return ctx.myPickup ? t('workflow.hint.employee.withOtherRider') : null;
      default:
        return null;
    }
  }
  return null;
};
