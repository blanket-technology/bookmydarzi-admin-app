import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Card, EmptyState, Pressable, SkeletonList } from '@/components/ui';
import { orderStatusLabel } from '@/constants/orderStatus';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { formatDate } from '@/utils/errors';

interface StaffActivityTabProps {
  orders: AdminOrderItem[];
  isLoading: boolean;
}

// Shared Activity timeline — same client-side "orders sorted by CreatedAt
// desc" composition for both Tailor and Employee (see BMD-Admin web's
// TailorFullDetails.jsx / BridgeEmployeeDetailPage.jsx, both of which do
// this rather than a real activity-log endpoint).
export const StaffActivityTab = ({ orders, isLoading }: StaffActivityTabProps) => {
  const { colors } = useTheme();

  const timelineEvents = useMemo(
    () =>
      [...orders]
        .filter((o) => o.created_at)
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
    [orders],
  );

  return (
    <View className="mt-4 mb-8">
      {isLoading ? (
        <SkeletonList count={4} />
      ) : timelineEvents.length === 0 ? (
        <EmptyState icon="time-outline" title="No activity yet" />
      ) : (
        <Card>
          {timelineEvents.map((o, index) => (
            <Pressable
              key={o.order_id}
              onPress={() => router.push(`/(drawer)/orders/${o.order_id}`)}
              className="flex-row py-3"
              style={index < timelineEvents.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : undefined}
            >
              <View className="w-2 h-2 rounded-full mt-1.5 mr-3" style={{ backgroundColor: colors.primary }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  Order {o.order_code ?? `#${o.order_id}`}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {orderStatusLabel(o.status)}
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                  {formatDate(o.created_at)}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
};
