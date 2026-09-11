import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Input, Pressable, SkeletonList } from '@/components/ui';
import { useAddOrderAddonMutation, useServiceAddons } from '@/features/orders/hooks/useOrders';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/errors';

interface AddOrderAddonSheetProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  /** ServiceSubCategory id booked on the item this add-on applies to -
   * only that service's own add-ons are shown (see backend's ServiceAddon.
   * ServiceId scoping). */
  serviceId?: number | null;
  /** Required when the order has more than one item. Omit for
   * single-item orders, same convention as MeasurementManageSheet. */
  orderItemId?: number;
  itemLabel?: string;
}

// Bridge/employee notices in person at pickup that the customer also
// wants an extra done (e.g. a button replaced) that wasn't selected
// online. Picks from the same real add-on catalog the customer saw on the
// service's page (GET /catalog/services/{id}/addons) rather than a
// free-text guess, so pricing is always the admin-configured amount, not
// whatever the employee types. Increases the order's balance due -
// collecting that extra amount is a separate step via the existing
// Collect Payment action, same COD-balance flow as any other outstanding
// balance.
export const AddOrderAddonSheet = ({
  visible,
  onClose,
  orderId,
  serviceId,
  orderItemId,
  itemLabel,
}: AddOrderAddonSheetProps) => {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const { data: addons, isLoading } = useServiceAddons(serviceId ?? undefined, visible);
  const addMutation = useAddOrderAddonMutation();

  const reset = () => {
    setSelectedId(null);
    setNote('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    addMutation.mutate(
      {
        orderId,
        payload: { order_item_id: orderItemId, addon_id: selectedId, note: note.trim() || undefined },
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Add Extra Service">
      {itemLabel ? (
        <Text className="text-xs font-semibold mb-3 -mt-1" style={{ color: colors.textSecondary }}>
          For: {itemLabel}
        </Text>
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : !addons || addons.length === 0 ? (
        <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
          No extra services are configured for this item's service.
        </Text>
      ) : (
        <View className="mb-2">
          {addons.map((addon) => {
            const selected = selectedId === addon.id;
            return (
              <Pressable
                key={addon.id}
                onPress={() => setSelectedId(addon.id)}
                className="flex-row items-start justify-between rounded-2xl p-3 mb-2 border"
                style={{
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primaryLight : colors.surface,
                }}
              >
                <View className="flex-row items-start flex-1 mr-2">
                  <View
                    className="w-5 h-5 rounded-md items-center justify-center mr-2.5 mt-0.5 border-2"
                    style={{
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : 'transparent',
                    }}
                  >
                    {selected ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                      {addon.name}
                    </Text>
                    {addon.description ? (
                      <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                        {addon.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                  +{formatCurrency(addon.price)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {selectedId ? (
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. exact spot, size, preference"
          multiline
        />
      ) : null}

      <Button
        title="Add to Order"
        onPress={handleSubmit}
        loading={addMutation.isPending}
        disabled={!selectedId}
        className="mt-3"
        fullWidth
      />
    </BottomSheet>
  );
};
