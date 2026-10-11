import { t } from '@/i18n';
import type { OrderStatus } from '@/types/orders';

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
    switch (s) {
      case 'pickup_scheduled':
      case 'pickup_pending':
        return t('workflow.hint.employee.pickup');
      case 'picked_up':
        return t('workflow.hint.employee.handover');
      case 'ready_for_dispatch':
        return t('workflow.hint.employee.collect');
      case 'out_for_delivery':
        return t('workflow.hint.employee.deliver');
      default:
        return null;
    }
  }
  return null;
};
