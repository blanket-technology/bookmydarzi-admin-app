import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Badge, Card, useDueLabel } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { paymentStatusLabel } from '@/constants/paymentStatus';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { isDueRelevant } from '@/utils/dueDate';
import { capitalize, formatCurrency, formatDate } from '@/utils/errors';
import { DetailRow } from './DetailRow';

/** Top-of-screen status/amount/customer-info card - identical across every
 * role except tailor, extracted unchanged from orders/[id].tsx.
 *
 * isTailorRole hides customer identity/contact and all price/payment
 * fields - the backend now redacts these from the tailor-facing order
 * response entirely (order_response_builder.py's
 * redact_order_response_for_tailor), so most of these already come back
 * blank for a tailor caller; this prop just keeps the UI from rendering
 * empty/zeroed rows for fields a tailor should never see in the first place. */
export const OrderSummaryCard = ({ order, isTailorRole = false }: { order: AdminOrderItem; isTailorRole?: boolean }) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const due = useDueLabel()(order.expected_delivery_date);
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Badge label={orderStatusLabel(order.status)} backgroundColor={`${statusColor}20`} color={statusColor} />
        {!isTailorRole ? (
          <Text className="text-xl font-bold" style={{ color: colors.primary }}>
            {formatCurrency(order.final_amount ?? order.amount)}
          </Text>
        ) : null}
      </View>

      {order.needs_manual_assignment ? (
        <View
          className="flex-row items-start gap-2 rounded-2xl p-3 mb-3"
          style={{ backgroundColor: `${colors.error}15`, borderWidth: 1, borderColor: colors.error }}
        >
          <Ionicons name="warning" size={18} color={colors.error} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-sm font-bold" style={{ color: colors.error }}>
              {t('orders.noTailorFoundTitle')}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.error }}>
              {t('orders.noTailorFoundBody')}
              {order.broadcast_exhausted_at ? `\n${t('orders.exhausted', { date: formatDate(order.broadcast_exhausted_at) })}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {!isTailorRole ? (
        <>
          <DetailRow label={t('orders.customer')} value={order.customer_name ?? '—'} colors={colors} />
          <DetailRow label={t('orderSummary.mobile')} value={order.customer_mobile ?? '—'} colors={colors} />
        </>
      ) : null}
      <DetailRow label={t('orders.service')} value={order.service_name ?? '—'} colors={colors} />
      {order.category_name_raw ? (
        <DetailRow label={t('orderSummary.category')} value={order.category_name_raw} colors={colors} />
      ) : null}
      {order.alteration_group ? (
        <DetailRow label={t('orderSummary.alterationType')} value={capitalize(order.alteration_group)} colors={colors} />
      ) : null}
      {!isTailorRole ? (
        <DetailRow label={t('orders.tailorLabel')} value={order.tailor_name ?? t('orders.unassigned')} colors={colors} />
      ) : null}
      {!isTailorRole && order.return_employee_id ? (
        <DetailRow
          label={t('orderSummary.returnHandledBy')}
          value={order.return_employee_name ?? `#${order.return_employee_id}`}
          colors={colors}
        />
      ) : null}
      {!isTailorRole && order.repair_pickup_employee_id ? (
        <DetailRow
          label={t('orderSummary.repairPickupHandledBy')}
          value={order.repair_pickup_employee_name ?? `#${order.repair_pickup_employee_id}`}
          colors={colors}
        />
      ) : null}
      {!isTailorRole && order.repair_delivery_employee_id ? (
        <DetailRow
          label={t('orderSummary.repairDeliveryHandledBy')}
          value={order.repair_delivery_employee_name ?? `#${order.repair_delivery_employee_id}`}
          colors={colors}
        />
      ) : null}
      {!isTailorRole ? (
        <>
          <DetailRow label={t('orderSummary.payment')} value={paymentStatusLabel(order.payment_status)} colors={colors} />
          {typeof order.remaining_amount === 'number' && order.remaining_amount > 0 && (
            <DetailRow label={t('orders.balanceDue')} value={formatCurrency(order.remaining_amount)} colors={colors} />
          )}
        </>
      ) : null}
      <DetailRow label={t('orderSummary.urgency')} value={capitalize(order.urgency_level ?? '—')} colors={colors} />
      <DetailRow label={t('orderSummary.created')} value={formatDate(order.created_at)} colors={colors} />
      <DetailRow
        label={t('orderSummary.expectedDelivery')}
        value={
          due
            ? isDueRelevant(order.status)
              ? `${formatDate(order.expected_delivery_date)} · ${due.text}`
              : formatDate(order.expected_delivery_date)
            : t('due.notSet')
        }
        valueColor={
          due && isDueRelevant(order.status)
            ? due.tone === 'overdue' || due.tone === 'today'
              ? colors.error
              : due.tone === 'soon'
                ? colors.warning
                : undefined
            : undefined
        }
        colors={colors}
      />
    </Card>
  );
};
