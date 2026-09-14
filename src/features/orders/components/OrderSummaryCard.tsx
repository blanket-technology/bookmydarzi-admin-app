import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Badge, Card } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { capitalize, formatCurrency, formatDate } from '@/utils/errors';
import { DetailRow } from './DetailRow';

/** Top-of-screen status/amount/customer-info card - identical across every
 * role, extracted unchanged from orders/[id].tsx. */
export const OrderSummaryCard = ({ order }: { order: AdminOrderItem }) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Badge label={orderStatusLabel(order.status)} backgroundColor={`${statusColor}20`} color={statusColor} />
        <Text className="text-xl font-bold" style={{ color: colors.primary }}>
          {formatCurrency(order.final_amount ?? order.amount)}
        </Text>
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

      <DetailRow label={t('orders.customer')} value={order.customer_name ?? '—'} colors={colors} />
      <DetailRow label={t('orderSummary.mobile')} value={order.customer_mobile ?? '—'} colors={colors} />
      <DetailRow label={t('orders.service')} value={order.service_name ?? '—'} colors={colors} />
      <DetailRow label={t('orderSummary.category')} value={order.category_name ?? '—'} colors={colors} />
      <DetailRow label={t('orders.tailorLabel')} value={order.tailor_name ?? t('orders.unassigned')} colors={colors} />
      <DetailRow label={t('orderSummary.payment')} value={capitalize(order.payment_status ?? '—')} colors={colors} />
      {typeof order.remaining_amount === 'number' && order.remaining_amount > 0 && (
        <DetailRow label={t('orders.balanceDue')} value={formatCurrency(order.remaining_amount)} colors={colors} />
      )}
      <DetailRow label={t('orderSummary.urgency')} value={capitalize(order.urgency_level ?? '—')} colors={colors} />
      <DetailRow label={t('orderSummary.created')} value={formatDate(order.created_at)} colors={colors} />
      <DetailRow label={t('orderSummary.expectedDelivery')} value={formatDate(order.expected_delivery_date)} colors={colors} />
    </Card>
  );
};
