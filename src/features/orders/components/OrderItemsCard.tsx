import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Card, Modal, Pressable } from '@/components/ui';
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
  canCancelItems,
  onCancelItem,
}: {
  order: AdminOrderItem;
  canManageMeasurements: boolean;
  onManageMeasurement: (item: { id?: number; label?: string }) => void;
  /** Employee-only, same gate as canManageMeasurements' caller passes for
   * that prop - see useOrderActions.ts's add_addon action. */
  canAddAddon?: boolean;
  onAddAddon?: (item: { id?: number; label?: string; serviceId?: number; existingAddonIds?: number[] }) => void;
  /** Admin-only - staff can cancel an individual item on behalf of a
   * customer. Real eligibility (stage, last-active-item) is enforced by
   * the preview the sheet itself loads; this just controls whether the
   * button appears at all. */
  canCancelItems?: boolean;
  onCancelItem?: (item: { id: number; label?: string }) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeItemCount = order.items.filter((it) => !it.is_cancelled).length;

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
          <View className="flex-1 pr-3" style={item.is_cancelled ? { opacity: 0.5 } : undefined}>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.text, textDecorationLine: item.is_cancelled ? 'line-through' : 'none' }}
            >
              {item.service_name ?? item.category_name ?? t('orderItems.item')}
              {item.person_name ? ` — ${item.person_name}` : ''}
            </Text>
            {item.is_cancelled ? (
              <Text className="text-xs mt-0.5 font-semibold" style={{ color: colors.error }}>
                {t('cancelItem.title')}
              </Text>
            ) : null}
            {/* item.category_name is intentionally blank for Custom
                Alterations (the service name itself is already specific -
                see order_response_builder.py's _item_category_name), but a
                Tailor/Bridge working a multi-item order still needs *some*
                category label per line. Fall back to the order-level
                category_name_raw/alteration_group, which are never blanked
                for exactly this reason - was previously only ever shown in
                the single-item summary card, never per-item here. */}
            {!item.category_name && (order.category_name_raw || order.alteration_group) ? (
              <Text className="text-xs mt-0.5" style={{ color: colors.primary }}>
                {order.category_name_raw}
                {order.alteration_group ? ` · ${capitalize(order.alteration_group)}` : ''}
              </Text>
            ) : null}
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {t('orderItems.qty', { qty: item.quantity })}
              {item.gender ? ` · ${capitalize(item.gender)}` : ''}
              {' · '}
              {item.has_measurement ? t('orderItems.measured') : t('orderItems.notMeasured')}
            </Text>
            {item.notes ? (
              <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                {item.notes}
              </Text>
            ) : null}
            {item.reference_photo_url ? (
              <Pressable
                onPress={() => setPreviewUrl(item.reference_photo_url!)}
                className="flex-row items-center mt-1.5 px-2 py-1 rounded-lg self-start"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Ionicons name="image-outline" size={12} color={colors.primary} />
                <Text className="text-[11px] font-semibold ml-1" style={{ color: colors.primary }}>
                  {t('orderItems.viewReferencePhoto')}
                </Text>
              </Pressable>
            ) : null}
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
            {/* Backend (employee_add_order_addon) only allows this while the
                garment is still on its way to the tailor, before stitching
                begins - matches this component's own gate so the button
                doesn't show up as a dead end that 422s once the order has
                moved past pickup (e.g. already out for delivery). */}
            {canAddAddon ? (
              <Pressable
                onPress={() =>
                  onAddAddon?.({
                    id: item.order_item_id ?? undefined,
                    label: `${item.service_name ?? t('orderItems.item')}${item.person_name ? ` ${t('orderItems.forPerson', { name: item.person_name })}` : ''}`,
                    serviceId: item.service_id ?? undefined,
                    existingAddonIds: (item.addons ?? [])
                      .map((a) => a.addon_id)
                      .filter((id): id is number => id != null),
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
            {canManageMeasurements ? (
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
            {canCancelItems && !item.is_cancelled && activeItemCount > 1 && item.order_item_id != null ? (
              <Pressable
                onPress={() =>
                  onCancelItem?.({
                    id: item.order_item_id!,
                    label: `${item.service_name ?? t('orderItems.item')}${item.person_name ? ` ${t('orderItems.forPerson', { name: item.person_name })}` : ''}`,
                  })
                }
                className="px-3 py-2 rounded-xl border"
                style={{ borderColor: colors.error }}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      <Modal visible={!!previewUrl} onClose={() => setPreviewUrl(null)} title={t('orderItems.referencePhoto')}>
        {previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
            resizeMode="contain"
          />
        ) : null}
      </Modal>
    </Card>
  );
};
