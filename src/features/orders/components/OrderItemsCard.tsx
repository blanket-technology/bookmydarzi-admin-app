import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { capitalize } from '@/utils/errors';

/** Multi-item order's per-line measurement list, each with its own fill/
 * update affordance for Bridge/employee and Admin roles. Only rendered by
 * the parent when order.items.length > 1 (a single-item order shows
 * OrderMeasurementCard instead). Extracted unchanged from orders/[id].tsx. */
export const OrderItemsCard = ({
  order,
  canManageMeasurements,
  onManageMeasurement,
}: {
  order: AdminOrderItem;
  canManageMeasurements: boolean;
  onManageMeasurement: (item: { id?: number; label?: string }) => void;
}) => {
  const { colors } = useTheme();

  return (
    <Card className="mb-4">
      <Text className="font-bold mb-3" style={{ color: colors.text }}>
        Items &amp; Measurements ({order.items.length})
      </Text>
      {order.items.map((item, idx) => (
        <View
          key={item.order_item_id ?? idx}
          className="flex-row items-center justify-between py-2.5"
          style={idx < order.items.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : undefined}
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {item.service_name ?? item.category_name ?? 'Item'}
              {item.person_name ? ` — ${item.person_name}` : ''}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Qty {item.quantity}
              {item.gender ? ` · ${capitalize(item.gender)}` : ''}
              {' · '}
              {item.has_measurement ? 'Measured' : 'Not measured'}
            </Text>
          </View>
          {canManageMeasurements && !['delivered', 'cancelled', 'order_rejected'].includes(order.status) ? (
            <Pressable
              onPress={() =>
                onManageMeasurement({
                  id: item.order_item_id ?? undefined,
                  label: `${item.service_name ?? 'Item'}${item.person_name ? ` for ${item.person_name}` : ''}`,
                })
              }
              className="px-3 py-2 rounded-xl"
              style={{
                backgroundColor: item.has_measurement ? colors.surface : colors.primary,
                borderWidth: item.has_measurement ? 1 : 0,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-bold" style={{ color: item.has_measurement ? colors.text : '#fff' }}>
                {item.has_measurement ? 'Update' : 'Fill'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </Card>
  );
};
