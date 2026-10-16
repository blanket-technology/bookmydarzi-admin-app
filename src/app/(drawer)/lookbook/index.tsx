import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, ConfirmModal, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useCreateLookbookItemMutation,
  useDeleteLookbookItemMutation,
  useLookbookAdmin,
  useUpdateLookbookItemMutation,
  useUploadLookbookImageMutation,
} from '@/features/lookbook/hooks/useLookbook';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from '@/store/toastStore';
import type { LookbookAdminItem } from '@/types/lookbook';
import { formatApiErrorDetail } from '@/utils/errors';
import { optionalText } from '@/utils/forms';

const EMPTY_FORM = { title: '', image_url: '', category_tag: 'general', caption: '', display_order: '0', is_active: true };

export default function LookbookScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch } = useLookbookAdmin();
  const uploadImageMutation = useUploadLookbookImageMutation();
  const createMutation = useCreateLookbookItemMutation();
  const updateMutation = useUpdateLookbookItemMutation();
  const deleteMutation = useDeleteLookbookItemMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LookbookAdminItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<LookbookAdminItem | null>(null);

  const items = data ?? [];

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  };
  const openEdit = (item: LookbookAdminItem) => {
    setEditingItem(item);
    setForm({
      title: item.title ?? '',
      image_url: item.image_url ?? '',
      category_tag: item.category_tag ?? 'general',
      caption: item.caption ?? '',
      display_order: String(item.display_order),
      is_active: item.is_active,
    });
    setSheetVisible(true);
  };

  const pickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB. Pick a smaller photo.');
      return;
    }
    uploadImageMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      { onSuccess: (res) => setForm((f) => ({ ...f, image_url: res.url })) },
    );
  };

  const handleSave = () => {
    if (!form.image_url.trim()) return;
    if (editingItem) {
      updateMutation.mutate(
        {
          id: editingItem.id,
          payload: {
            title: optionalText(form.title, true),
            image_url: form.image_url,
            // Tags are matched exactly by the customer app's filter: "Wedding" and
            // "wedding" would otherwise become two separate filters.
            category_tag: (optionalText(form.category_tag, true) ?? '').toLowerCase(),
            caption: optionalText(form.caption, true),
            display_order: Number(form.display_order) || 0,
            is_active: form.is_active,
          },
        },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else {
      createMutation.mutate(
        {
          title: optionalText(form.title, false),
          image_url: form.image_url,
          category_tag: optionalText(form.category_tag, false)?.toLowerCase(),
          caption: optionalText(form.caption, false),
          display_order: Number(form.display_order) || 0,
        },
        { onSuccess: () => setSheetVisible(false) },
      );
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Lookbook"
        subtitle={`${items.length} items`}
        rightAction={
          <Pressable
            onPress={openNew}
            hitSlop={8}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <Loader message="Loading lookbook..." />
        ) : isError ? (
          <EmptyState title="Failed to load lookbook" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon="images-outline" title="No lookbook items yet" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openEdit(item)}
                  className="rounded-2xl overflow-hidden border mb-1 w-[47%] md:w-[31%] lg:w-[23%]"
                >
                  <View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card }}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
                    ) : (
                      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surface }} />
                    )}
                    <View className="p-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold flex-1" style={{ color: colors.text }} numberOfLines={1}>
                          {item.title ?? 'Untitled'}
                        </Text>
                        {!item.is_active ? <Badge label="Off" backgroundColor="#fee2e2" color="#dc2626" /> : null}
                      </View>
                      <Text className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                        {item.category_tag ?? 'general'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={editingItem ? 'Edit Lookbook Item' : 'New Lookbook Item'}
        footer={
          <Button
            title={editingItem ? 'Save Changes' : 'Create Item'}
            onPress={handleSave}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!form.image_url.trim()}
            fullWidth
          />
        }
      >
        {form.image_url ? (
          <Image source={{ uri: form.image_url }} style={{ width: '100%', aspectRatio: 1, borderRadius: 16, marginBottom: 12 }} contentFit="cover" />
        ) : null}
        <Button
          title="Pick Image"
          variant="outline"
          className="mb-4"
          loading={uploadImageMutation.isPending}
          onPress={pickAndUploadImage}
          fullWidth
        />
        <Input label="Title" value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} />
        <Input label="Category Tag" value={form.category_tag} onChangeText={(t) => setForm((f) => ({ ...f, category_tag: t }))} placeholder="general" />
        <Input label="Caption" value={form.caption} onChangeText={(t) => setForm((f) => ({ ...f, caption: t }))} multiline />
        <Input label="Display Order" value={form.display_order} onChangeText={(t) => setForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
        {editingItem ? (
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text }}>Active</Text>
            <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
          </View>
        ) : null}
        {editingItem ? (
          <Pressable onPress={() => setDeleteTarget(editingItem)} className="items-center mb-3">
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              Delete Item
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Lookbook Item"
        message="Remove this item from the lookbook?"
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
