import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { BottomSheet, Button, Card, ConfirmModal, EmptyState, Header, Input, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import {
  useCreateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useInventory,
  useUpdateInventoryItemMutation,
} from '@/features/inventory/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { InventoryItem } from '@/types/inventory';
import { formatApiErrorDetail, formatCurrency } from '@/utils/errors';

const EMPTY_FORM = { name: '', category: '', quantity: '0', unit: '', price_per_unit: '0' };

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  // Backend: writes require ADMIN/SUPERADMIN/EMPLOYEE (tailor is read-only —
  // inventory.py's GET allows TAILOR but POST/PATCH/DELETE don't).
  const canWrite = ['admin', 'superadmin', 'employee'].includes(normalizedRole);

  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isRefetching } = useInventory();
  const createMutation = useCreateInventoryItemMutation();
  const updateMutation = useUpdateInventoryItemMutation();
  const deleteMutation = useDeleteInventoryItemMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const items = (data ?? []).filter((item) =>
    search.trim() ? item.Name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  };
  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.Name,
      category: item.Category ?? '',
      quantity: String(item.Quantity),
      unit: item.Unit ?? '',
      price_per_unit: String(item.PricePerUnit),
    });
    setSheetVisible(true);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <Card className="mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-bold" style={{ color: colors.text }}>
            {item.Name}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {item.Category ?? 'Uncategorized'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold" style={{ color: colors.primary }}>
            {item.Quantity} {item.Unit ?? ''}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {formatCurrency(item.PricePerUnit)}/unit
          </Text>
        </View>
      </View>
      {canWrite ? (
        <View className="flex-row mt-3" style={{ gap: 10 }}>
          <Pressable onPress={() => openEdit(item)} className="flex-row items-center">
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text className="ml-1 text-xs font-semibold" style={{ color: colors.primary }}>
              Edit
            </Text>
          </Pressable>
          <Pressable onPress={() => setDeleteTarget(item)} className="flex-row items-center">
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text className="ml-1 text-xs font-semibold" style={{ color: colors.error }}>
              Delete
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category || undefined,
      quantity: Number(form.quantity) || 0,
      unit: form.unit || undefined,
      price_per_unit: Number(form.price_per_unit) || 0,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.Id, payload }, { onSuccess: () => setSheetVisible(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setSheetVisible(false) });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Inventory"
        subtitle={`${items.length} items`}
        rightAction={
          canWrite ? (
            <Pressable
              onPress={openNew}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white text-xl font-bold">+</Text>
            </Pressable>
          ) : undefined
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search inventory..." />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load inventory"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.Id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={<EmptyState icon="cube-outline" title="No inventory items" />}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={editingItem ? 'Edit Item' : 'New Item'}
      >
        <Input label="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
        <Input label="Category" value={form.category} onChangeText={(t) => setForm((f) => ({ ...f, category: t }))} />
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <Input label="Quantity" value={form.quantity} onChangeText={(t) => setForm((f) => ({ ...f, quantity: t }))} keyboardType="decimal-pad" />
          </View>
          <View className="flex-1">
            <Input label="Unit" value={form.unit} onChangeText={(t) => setForm((f) => ({ ...f, unit: t }))} placeholder="meters, pcs..." />
          </View>
        </View>
        <Input
          label="Price Per Unit (₹)"
          value={form.price_per_unit}
          onChangeText={(t) => setForm((f) => ({ ...f, price_per_unit: t }))}
          keyboardType="decimal-pad"
        />
        <Button
          title={editingItem ? 'Save Changes' : 'Add Item'}
          onPress={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={!form.name.trim()}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Item"
        message={`Remove "${deleteTarget?.Name}" from inventory?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.Id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
