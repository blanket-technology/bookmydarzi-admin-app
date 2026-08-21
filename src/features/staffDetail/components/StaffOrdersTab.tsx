import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Badge, EmptyState, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { formatCurrency, formatDate } from '@/utils/errors';

export interface StaffOrderStatusOption {
  value: string;
  label: string;
}

interface StaffOrdersTabProps {
  orders: AdminOrderItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  statusFilterLabel: string;
  onOpenStatusPicker: () => void;
}

// Shared Orders-tab list (status filter trigger + paginated order cards) —
// identical rendering for Tailor and Employee, just fed a different
// pre-filtered `orders` query (tailor_id vs employee_id) by each screen.
export const StaffOrdersTab = ({
  orders,
  isLoading,
  isError,
  onRetry,
  page,
  totalPages,
  onPageChange,
  statusFilterLabel,
  onOpenStatusPicker,
}: StaffOrdersTabProps) => {
  const { colors } = useTheme();

  return (
    <View className="mt-4 mb-8">
      <Pressable
        onPress={onOpenStatusPicker}
        className="flex-row items-center justify-between px-4 py-3 rounded-2xl border mb-3"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <Text className="text-sm font-medium" style={{ color: colors.text }}>
          Status: {statusFilterLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : isError ? (
        <EmptyState title="Failed to load orders" actionLabel="Retry" onAction={onRetry} />
      ) : orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No orders found" />
      ) : (
        <>
          {orders.map((order) => {
            const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;
            return (
              <Pressable
                key={order.order_id}
                onPress={() => router.push(`/(drawer)/orders/${order.order_id}`)}
                className="rounded-2xl p-3.5 mb-2.5 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-sm" style={{ color: colors.text }}>
                      {order.order_code ?? order.order_id}
                    </Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                      {formatDate(order.created_at)}
                    </Text>
                  </View>
                  <Badge label={orderStatusLabel(order.status)} backgroundColor={`${statusColor}20`} color={statusColor} />
                </View>
                {order.final_amount != null || order.amount != null ? (
                  <Text className="text-xs font-semibold mt-2" style={{ color: colors.primary }}>
                    {formatCurrency(order.final_amount ?? order.amount)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </>
      )}
    </View>
  );
};
