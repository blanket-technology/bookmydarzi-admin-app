import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Input, Pressable, SkeletonList } from '@/components/ui';
import { useAddOrderAddonMutation, useServiceAddons } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency, getMutationError } from '@/utils/errors';
import { toast } from '@/store/toastStore';

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
  /** Addon IDs already attached to this order item - excluded from the
   * picker so the same add-on can't be attached twice, while every other
   * add-on in the catalog stays selectable. */
  existingAddonIds?: number[];
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
//
// Bug fix: this used to be a single-select picker that auto-closed on
// submit, so a Bridge employee could only add ONE extra service per
// open/close cycle - re-adding meant reopening the sheet from scratch, and
// an already-added add-on stayed selectable (no exclusion), making
// duplicate adds possible. Backend already supports any number of add-ons
// per item (one POST per add-on id, no server-side cap) - this just
// catches the UI up: multi-select checkboxes mirror the customer app's
// AddonPicker, submit fires one request per selected add-on, and anything
// already on the item is filtered out of the list entirely.
export const AddOrderAddonSheet = ({
  visible,
  onClose,
  orderId,
  serviceId,
  orderItemId,
  itemLabel,
  existingAddonIds,
}: AddOrderAddonSheetProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: addons, isLoading } = useServiceAddons(serviceId ?? undefined, visible);
  const addMutation = useAddOrderAddonMutation();

  const excludedIds = new Set(existingAddonIds ?? []);
  const availableAddons = (addons ?? []).filter((a) => !excludedIds.has(a.id));

  // Reset selection whenever the sheet is opened fresh for a (possibly
  // different) item, not just on close - prevents a stale selection from
  // one item leaking into the next if the parent reuses this component
  // instance across targets.
  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      setNotes({});
    }
  }, [visible, orderItemId]);

  const reset = () => {
    setSelectedIds(new Set());
    setNotes({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggle = (addonId: number) => {
    const next = new Set(selectedIds);
    if (next.has(addonId)) {
      next.delete(addonId);
    } else {
      next.add(addonId);
    }
    setSelectedIds(next);
  };

  const selectedTotal = availableAddons
    .filter((a) => selectedIds.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    const ids = Array.from(selectedIds);
    let addedCount = 0;
    try {
      // Sequential, not Promise.all: each call adjusts the order's running
      // FinalAmount/RemainingAmount server-side (employee_add_order_addon),
      // so concurrent requests racing against the same order row risk a
      // lost update. One at a time is the safe-by-construction choice here.
      for (const addonId of ids) {
        await addMutation.mutateAsync({
          orderId,
          payload: { order_item_id: orderItemId, addon_id: addonId, note: notes[addonId]?.trim() || undefined },
        });
        addedCount += 1;
      }
      handleClose();
    } catch (error) {
      // Whatever succeeded before the failure stays added (each request
      // already committed server-side) - tell the employee how far it got
      // rather than implying nothing happened.
      if (addedCount > 0) {
        toast.info(t('addAddon.partiallyAdded', { count: addedCount, total: ids.length }));
      } else {
        toast.error(getMutationError(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('addAddon.title')}
      footer={
        <Button
          title={
            selectedIds.size > 1
              ? t('addAddon.addCountToOrder', { count: selectedIds.size })
              : t('addAddon.addToOrder')
          }
          onPress={handleSubmit}
          loading={submitting}
          disabled={selectedIds.size === 0}
          fullWidth
        />
      }
    >
      {itemLabel ? (
        <Text className="text-xs font-semibold mb-3 -mt-1" style={{ color: colors.textSecondary }}>
          {t('measurementManage.forItem', { item: itemLabel })}
        </Text>
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : availableAddons.length === 0 ? (
        <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
          {addons && addons.length > 0
            ? t('addAddon.allAlreadyAdded')
            : t('addAddon.noExtraServices')}
        </Text>
      ) : (
        <View className="mb-2">
          {availableAddons.map((addon) => {
            const selected = selectedIds.has(addon.id);
            return (
              <View key={addon.id} className="mb-2">
                <Pressable
                  onPress={() => toggle(addon.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className="flex-row items-start justify-between rounded-2xl p-3 border"
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
                {selected ? (
                  <View className="mt-1.5">
                    <Input
                      value={notes[addon.id] ?? ''}
                      onChangeText={(text) => setNotes((n) => ({ ...n, [addon.id]: text }))}
                      placeholder={t('addAddon.notePlaceholder')}
                      multiline
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {selectedIds.size > 0 ? (
        <View className="flex-row items-center justify-between py-2 px-1">
          <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
            {t('addAddon.selectedCount', { count: selectedIds.size })}
          </Text>
          <Text className="text-sm font-bold" style={{ color: colors.primary }}>
            +{formatCurrency(selectedTotal)}
          </Text>
        </View>
      ) : null}
    </BottomSheet>
  );
};
