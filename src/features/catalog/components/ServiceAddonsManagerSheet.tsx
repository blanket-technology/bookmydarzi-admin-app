import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { BottomSheet, Button, ConfirmModal, EmptyState, Input, Loader, Pressable } from '@/components/ui';
import {
  useAdminServiceAddons,
  useCreateServiceAddonMutation,
  useDeleteServiceAddonMutation,
  useUpdateServiceAddonMutation,
} from '@/features/catalog/hooks/useCatalog';
import { useTheme } from '@/hooks/useTheme';
import type { ServiceAddon } from '@/types/catalog';
import { formatCurrency } from '@/utils/errors';

interface ServiceAddonsManagerSheetProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string | number | null;
  serviceName: string;
}

const ADDON_FORM = { name: '', description: '', price: '0', display_order: '0', is_active: true };

// Per-service add-on manager - mirrors final's AddonsManagerPanel.jsx.
// Opened from the service edit sheet in catalog/index.tsx once a service
// has a real id (add-ons are scoped to an existing service, not creatable
// alongside a brand-new one).
export function ServiceAddonsManagerSheet({ visible, onClose, serviceId, serviceName }: ServiceAddonsManagerSheetProps) {
  const { colors } = useTheme();
  const { data: addons, isLoading } = useAdminServiceAddons(serviceId ?? '', visible && !!serviceId);
  const createMutation = useCreateServiceAddonMutation(serviceId ?? '');
  const updateMutation = useUpdateServiceAddonMutation(serviceId ?? '');
  const deleteMutation = useDeleteServiceAddonMutation(serviceId ?? '');

  const [formVisible, setFormVisible] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [form, setForm] = useState(ADDON_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ServiceAddon | null>(null);

  const openNew = () => {
    setEditingAddon(null);
    setForm(ADDON_FORM);
    setFormVisible(true);
  };
  const openEdit = (addon: ServiceAddon) => {
    setEditingAddon(addon);
    setForm({
      name: addon.name,
      description: addon.description ?? '',
      price: String(addon.price),
      display_order: String(addon.display_order),
      is_active: addon.is_active,
    });
    setFormVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      price: Math.max(0, Number(form.price) || 0),
      display_order: Math.max(0, Number(form.display_order) || 0),
      is_active: form.is_active,
    };
    if (editingAddon) {
      updateMutation.mutate({ addonId: editingAddon.id, payload }, { onSuccess: () => setFormVisible(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setFormVisible(false) });
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Add-ons — ${serviceName}`}>
        {isLoading ? (
          <Loader message="Loading add-ons..." />
        ) : !addons || addons.length === 0 ? (
          <EmptyState icon="add-circle-outline" title="No add-ons yet" description="Extras like Button Replacement or Length Shortening" />
        ) : (
          <View className="mb-2">
            {addons.map((addon) => (
              <View
                key={addon.id}
                className="flex-row items-center justify-between py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-1 mr-2">
                  <Text style={{ color: colors.text }} className="font-medium">
                    {addon.name}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {formatCurrency(addon.price)}
                    {!addon.is_active ? ' · Inactive' : ''}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 14 }}>
                  <Pressable onPress={() => openEdit(addon)} hitSlop={8}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => setDeleteTarget(addon)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        <Button title="+ Add Add-on" variant="outline" onPress={openNew} fullWidth />
      </BottomSheet>

      <BottomSheet visible={formVisible} onClose={() => setFormVisible(false)} title={editingAddon ? 'Edit Add-on' : 'New Add-on'}>
        <Input label="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
        <Input label="Description" value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline />
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <Input label="Price (₹)" value={form.price} onChangeText={(t) => setForm((f) => ({ ...f, price: t }))} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Input label="Display Order" value={form.display_order} onChangeText={(t) => setForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
          </View>
        </View>
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }}>Active</Text>
          <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
        </View>
        <Button
          title={editingAddon ? 'Save Changes' : 'Create Add-on'}
          onPress={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={!form.name.trim()}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Add-on"
        message={`Permanently delete "${deleteTarget?.name}"? This does not affect past orders.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
