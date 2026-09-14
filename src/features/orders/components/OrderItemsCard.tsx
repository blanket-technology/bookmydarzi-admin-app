import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import { useAppLanguage } from '@/hooks/useAppLanguage';
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
  canAddAddon,
  onAddAddon,
}: {
  order: AdminOrderItem;
  canManageMeasurements: boolean;
  onManageMeasurement: (item: { id?: number; label?: string }) => void;
  /** Employee-only, same gate as canManageMeasurements' caller passes for
   * that prop - see useOrderActions.ts's add_addon action. */
  canAddAddon?: boolean;
  onAddAddon?: (item: { id?: number; label?: string; serviceId?: number }) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();

  return (
    <Card className="mb-4">
      <Text className="font-bold mb-3" style={{ color: colors.text }}>
        {t('orderItems.title', { count: order.items.length })}
      </Text>
      {order.items.map((item, idx) => (
        <View
          key={item.order_item_id ?? idx}
          className="flex-row items-center justify-between py-2.5"
          style={idx < order.items.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : undefined}
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {item.service_name ?? item.category_name ?? t('orderItems.item')}
              {item.person_name ? ` — ${item.person_name}` : ''}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {t('orderItems.qty', { qty: item.quantity })}
              {item.gender ? ` · ${capitalize(item.gender)}` : ''}
              {' · '}
              {item.has_measurement ? t('orderItems.measured') : t('orderItems.notMeasured')}
            </Text>
            {item.addons && item.addons.length > 0 ? (
              <View className="mt-1.5">
                {item.addons.map((addon, aIdx) => (
                  <Text key={addon.addon_id ?? aIdx} className="text-xs" style={{ color: colors.primary }}>
                    + {addon.name}
                    {addon.note ? ` (${addon.note})` : ''}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          <View className="flex-row" style={{ gap: 6 }}>
            {canAddAddon && !['delivered', 'cancelled', 'order_rejected'].includes(order.status) ? (
              <Pressable
                onPress={() =>
                  onAddAddon?.({
                    id: item.order_item_id ?? undefined,
                    label: `${item.service_name ?? t('orderItems.item')}${item.person_name ? ` ${t('orderItems.forPerson', { name: item.person_name })}` : ''}`,
                    serviceId: item.service_id ?? undefined,
                  })
                }
                className="px-3 py-2 rounded-xl border"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  {t('orderItems.addExtra')}
                </Text>
              </Pressable>
            ) : null}
            {canManageMeasurements && !['delivered', 'cancelled', 'order_rejected'].includes(order.status) ? (
              <Pressable
                onPress={() =>
                  onManageMeasurement({
                    id: item.order_item_id ?? undefined,
                    label: `${item.service_name ?? t('orderItems.item')}${item.person_name ? ` ${t('orderItems.forPerson', { name: item.person_name })}` : ''}`,
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
                  {item.has_measurement ? t('common.edit') : t('orderItems.fill')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
};
