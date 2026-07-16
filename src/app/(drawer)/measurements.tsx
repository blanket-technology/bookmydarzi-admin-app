import { ScrollView, Text, View } from 'react-native';
import { Card, EmptyState, Header } from '@/components/ui';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useTheme } from '@/hooks/useTheme';
import { capitalize } from '@/utils/errors';

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useOrders({ status: 'measurement_updated', limit: 20 });

  const orders = data?.orders ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Measurements" subtitle="Orders with measurement updates" />
      <ScrollView className="px-5">
        {isLoading ? null : orders.length === 0 ? (
          <EmptyState
            icon="resize-outline"
            title="No measurement records"
            description="Orders with updated measurements will appear here"
          />
        ) : (
          orders.map((order) => (
            <Card key={order.order_id} className="mb-3">
              <Text className="font-bold" style={{ color: colors.text }}>
                {order.order_code ?? order.order_id}
              </Text>
              <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {order.customer_name} · {order.service_name}
              </Text>
              <Text className="text-xs mt-2 capitalize" style={{ color: colors.primary }}>
                {capitalize(order.status)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
