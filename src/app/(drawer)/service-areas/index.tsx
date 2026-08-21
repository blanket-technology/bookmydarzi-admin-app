import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, ConfirmModal, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useCreateServiceAreaMutation,
  useDeleteServiceAreaMutation,
  useServiceAreas,
  useUpdateServiceAreaMutation,
} from '@/features/serviceAreas/hooks/useServiceAreas';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { ServiceArea } from '@/types/serviceAreas';
import { formatApiErrorDetail } from '@/utils/errors';

const EMPTY_FORM = { name: '', latitude: '', longitude: '', radius_km: '10', is_active: true };

export default function ServiceAreasScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch } = useServiceAreas();
  const createMutation = useCreateServiceAreaMutation();
  const updateMutation = useUpdateServiceAreaMutation();
  const deleteMutation = useDeleteServiceAreaMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceArea | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ServiceArea | null>(null);

  const areas = data ?? [];

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  };

  const openEdit = (item: ServiceArea) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      radius_km: String(item.radius_km),
      is_active: item.is_active,
    });
    setSheetVisible(true);
  };

  const handleSave = () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius_km = Number(form.radius_km);
    if (!form.name.trim() || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radius_km)) return;

    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, payload: { name: form.name.trim(), latitude, longitude, radius_km, is_active: form.is_active } },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else {
      createMutation.mutate(
        { name: form.name.trim(), latitude, longitude, radius_km },
        { onSuccess: () => setSheetVisible(false) },
      );
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Service Areas"
        subtitle={`${areas.length} areas`}
        rightAction={
          <Pressable
            onPress={openNew}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <Loader message="Loading service areas..." />
        ) : isError ? (
          <EmptyState title="Failed to load service areas" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : areas.length === 0 ? (
          <EmptyState icon="map-outline" title="No service areas yet" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {areas.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openEdit(item)}
                className="rounded-2xl p-4 mb-3 border flex-row items-center justify-between"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-1 mr-2">
                  <Text className="font-bold text-base" style={{ color: colors.text }}>
                    {item.name}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} · {item.radius_km} km radius
                  </Text>
                </View>
                {!item.is_active ? <Badge label="Inactive" backgroundColor="#fee2e2" color="#dc2626" /> : (
                  <Badge label="Active" backgroundColor="#dcfce7" color="#16a34a" />
                )}
              </Pressable>
            ))}
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={editingItem ? 'Edit Service Area' : 'New Service Area'}
      >
        <Input label="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
        <Input label="Latitude" value={form.latitude} onChangeText={(t) => setForm((f) => ({ ...f, latitude: t }))} keyboardType="numbers-and-punctuation" />
        <Input label="Longitude" value={form.longitude} onChangeText={(t) => setForm((f) => ({ ...f, longitude: t }))} keyboardType="numbers-and-punctuation" />
        <Input label="Radius (km)" value={form.radius_km} onChangeText={(t) => setForm((f) => ({ ...f, radius_km: t }))} keyboardType="number-pad" />
        {editingItem ? (
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text }}>Active</Text>
            <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
          </View>
        ) : null}
        {editingItem ? (
          <Pressable onPress={() => setDeleteTarget(editingItem)} className="items-center mb-3">
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              Delete Service Area
            </Text>
          </Pressable>
        ) : null}
        <Button
          title={editingItem ? 'Save Changes' : 'Create Service Area'}
          onPress={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={!form.name.trim() || !form.latitude || !form.longitude}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Service Area"
        message="Permanently delete this service area?"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
          setSheetVisible(false);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
