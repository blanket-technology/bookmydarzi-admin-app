import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Badge, Card } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { capitalize, formatCurrency, formatDate } from '@/utils/errors';
import { DetailRow } from './DetailRow';

/** Top-of-screen status/amount/customer-info card - identical across every
 * role, extracted unchanged from orders/[id].tsx. */
export const OrderSummaryCard = ({ order }: { order: AdminOrderItem }) => {
  const { colors } = useTheme();
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
              No tailor found
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.error }}>
              No tailor accepted after every broadcast round, including the all-tailor fallback. Assign
              a tailor manually below.
              {order.broadcast_exhausted_at ? `\nExhausted ${formatDate(order.broadcast_exhausted_at)}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <DetailRow label="Customer" value={order.customer_name ?? '—'} colors={colors} />
      <DetailRow label="Mobile" value={order.customer_mobile ?? '—'} colors={colors} />
      <DetailRow label="Service" value={order.service_name ?? '—'} colors={colors} />
      <DetailRow label="Category" value={order.category_name ?? '—'} colors={colors} />
      <DetailRow label="Tailor" value={order.tailor_name ?? 'Unassigned'} colors={colors} />
      <DetailRow label="Payment" value={capitalize(order.payment_status ?? '—')} colors={colors} />
      {typeof order.remaining_amount === 'number' && order.remaining_amount > 0 && (
        <DetailRow label="Balance Due" value={formatCurrency(order.remaining_amount)} colors={colors} />
      )}
      <DetailRow label="Urgency" value={capitalize(order.urgency_level ?? '—')} colors={colors} />
      <DetailRow label="Created" value={formatDate(order.created_at)} colors={colors} />
      <DetailRow label="Expected Delivery" value={formatDate(order.expected_delivery_date)} colors={colors} />
    </Card>
  );
};
