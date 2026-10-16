import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, ConfirmModal, DateField, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useCreateOfferMutation,
  useDeleteOfferMutation,
  useOffers,
  useUpdateOfferMutation,
  useUploadOfferImageMutation,
} from '@/features/offers/hooks/useOffers';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from '@/store/toastStore';
import type { OfferItem } from '@/types/offers';
import { optionalText } from '@/utils/forms';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

// The backend stores ValidFrom/ValidUntil as full datetimes (see
// app/schemas/home_admin.py), but DateField only picks a calendar date -
// this trims a loaded "2026-12-31T23:59:59" down to "2026-12-31" for the
// picker, and isoDateToStartOfDay/isoDateToEndOfDay expand it back out when
// saving (Valid from = start of that day, Valid until = end of that day,
// matching the exact instant this form previously asked the admin to type
// by hand as e.g. "2026-12-31T23:59:59").
function toDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}
function isoDateToStartOfDay(dateOnly: string): string {
  return `${dateOnly}T00:00:00`;
}
function isoDateToEndOfDay(dateOnly: string): string {
  return `${dateOnly}T23:59:59`;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'flat',
  discount_percent: '10',
  discount_amount: '',
  min_order_value: '',
  max_uses: '',
  coupon_code: '',
  image_url: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

export default function OffersScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch } = useOffers();
  const uploadImageMutation = useUploadOfferImageMutation();
  const createMutation = useCreateOfferMutation();
  const updateMutation = useUpdateOfferMutation();
  const deleteMutation = useDeleteOfferMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<OfferItem | null>(null);

  const offers = data ?? [];

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  };

  const openEdit = (item: OfferItem) => {
    setEditingItem(item);
    setForm({
      title: item.Title,
      description: item.Description ?? '',
      discount_type: item.DiscountType,
      discount_percent: String(item.DiscountPercent ?? 0),
      discount_amount: item.DiscountAmount != null ? String(item.DiscountAmount) : '',
      min_order_value: item.MinOrderValue ? String(item.MinOrderValue) : '',
      max_uses: item.MaxUses ? String(item.MaxUses) : '',
      coupon_code: item.CouponCode ?? '',
      image_url: item.ImageUrl ?? '',
      valid_from: toDateOnly(item.ValidFrom) ?? '',
      valid_until: toDateOnly(item.ValidUntil) ?? '',
      is_active: item.IsActive,
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
    uploadImageMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      { onSuccess: (res) => setForm((f) => ({ ...f, image_url: res.url })) },
    );
  };

  // Backend rejects <=0 / >100 (app/schemas/home_admin.py) but only after a
  // round-trip 422 - clamp here so an admin can't even submit an invalid
  // value, matching web's <input min="0" max="100"> (OfferFormModal.jsx).
  const clampedDiscountPercent = Math.min(100, Math.max(0, Number(form.discount_percent) || 0));
  const isDiscountPercentInvalid =
    form.discount_type === 'percentage' &&
    (Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100 || Number.isNaN(Number(form.discount_percent)));

  // Mirrors backend's OfferCreate._validate_discount (app/schemas/
  // home_admin.py) for the flat branch - discount_amount must be positive,
  // and min_order_value must exceed it (a flat coupon can't discount more
  // than or equal to its own qualifying minimum). Previously unvalidated
  // client-side entirely, so Save was always enabled here and every bad
  // flat offer round-tripped a raw 422.
  const flatDiscountAmount = Number(form.discount_amount) || 0;
  const flatMinOrderValue = Number(form.min_order_value) || 0;
  const isDiscountAmountInvalid =
    form.discount_type === 'flat' && (flatDiscountAmount <= 0 || Number.isNaN(Number(form.discount_amount)));
  const isMinOrderValueInvalid =
    form.discount_type === 'flat' && !isDiscountAmountInvalid && flatMinOrderValue <= flatDiscountAmount;
  const isFlatDiscountInvalid = isDiscountAmountInvalid || isMinOrderValueInvalid;

  const buildPayload = () => ({
    title: form.title.trim() || undefined,
    // Clearing a field while editing must send '' (omitted = "leave unchanged").
    description: optionalText(form.description, !!editingItem),
    discount_type: form.discount_type,
    discount_percent: form.discount_type === 'percentage' ? clampedDiscountPercent : undefined,
    discount_amount: form.discount_type === 'flat' ? Math.max(0, Number(form.discount_amount) || 0) || undefined : undefined,
    min_order_value: Math.max(0, Number(form.min_order_value) || 0),
    max_uses: form.max_uses.trim() ? Math.max(1, Number(form.max_uses) || 1) : undefined,
    coupon_code: optionalText(form.coupon_code, !!editingItem),
    image_url: optionalText(form.image_url, !!editingItem),
    // Only send a date the admin actually changed: re-sending the loaded value
    // rewrote the exact start/end time to 00:00:00 / 23:59:59 on every edit.
    valid_from:
      form.valid_from && !(editingItem && form.valid_from === toDateOnly(editingItem.ValidFrom))
        ? isoDateToStartOfDay(form.valid_from)
        : undefined,
    valid_until:
      form.valid_until && !(editingItem && form.valid_until === toDateOnly(editingItem.ValidUntil))
        ? isoDateToEndOfDay(form.valid_until)
        : undefined,
  });

  const handleSave = () => {
    if (!form.title.trim() || isDiscountPercentInvalid || isFlatDiscountInvalid) return;
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.Id, payload: { ...buildPayload(), title: form.title.trim(), is_active: form.is_active } },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else {
      createMutation.mutate(
        { ...buildPayload(), title: form.title.trim() } as never,
        { onSuccess: () => setSheetVisible(false) },
      );
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Offers & Coupons"
        subtitle={`${offers.length} offers`}
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
          <Loader message="Loading offers..." />
        ) : isError ? (
          <EmptyState title="Failed to load offers" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : offers.length === 0 ? (
          <EmptyState icon="pricetag-outline" title="No offers yet" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {offers.map((item) => (
              <Pressable
                key={item.Id}
                onPress={() => openEdit(item)}
                className="rounded-2xl p-4 mb-3 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-base" style={{ color: colors.text }}>
                      {item.Title}
                    </Text>
                    {item.CouponCode ? (
                      <Text className="text-xs mt-0.5 font-semibold" style={{ color: colors.primary }}>
                        {item.CouponCode}
                      </Text>
                    ) : null}
                  </View>
                  {!item.IsActive ? <Badge label="Off" backgroundColor="#fee2e2" color="#dc2626" /> : null}
                </View>
                <Text className="text-sm mt-2 font-semibold" style={{ color: colors.textSecondary }}>
                  {item.DiscountType === 'flat'
                    ? `${formatCurrency(item.DiscountAmount ?? 0)} off`
                    : `${item.DiscountPercent}% off`}
                </Text>
                {item.MinOrderValue ? (
                  <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    Min order {formatCurrency(item.MinOrderValue)}
                  </Text>
                ) : null}
                {item.MaxUses ? (
                  <Text
                    className="text-xs mt-1 font-semibold"
                    style={{ color: (item.UsageCount ?? 0) >= item.MaxUses ? colors.error : colors.textMuted }}
                  >
                    {item.UsageCount ?? 0}/{item.MaxUses} used
                  </Text>
                ) : null}
                {item.ValidUntil ? (
                  <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    Valid until {formatDate(item.ValidUntil)}
                  </Text>
                ) : null}
              </Pressable>
            ))}
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={editingItem ? 'Edit Offer' : 'New Offer'}
        footer={
          <Button
            title={editingItem ? 'Save Changes' : 'Create Offer'}
            onPress={handleSave}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!form.title.trim() || isDiscountPercentInvalid || isFlatDiscountInvalid}
            fullWidth
          />
        }
      >
        {form.image_url ? (
          <Image source={{ uri: form.image_url }} style={{ width: '100%', aspectRatio: 2, borderRadius: 16, marginBottom: 12 }} contentFit="cover" />
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
        <Input label="Description" value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline />
        <Input label="Coupon Code" value={form.coupon_code} onChangeText={(t) => setForm((f) => ({ ...f, coupon_code: t.toUpperCase() }))} autoCapitalize="characters" />

        <View className="flex-row items-center justify-between mb-2">
          <Text style={{ color: colors.text }}>Discount type</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {(['percentage', 'flat'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setForm((f) => ({ ...f, discount_type: type }))}
                className="px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: form.discount_type === type ? colors.primary : colors.border,
                  backgroundColor: form.discount_type === type ? colors.primaryLight : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-semibold capitalize"
                  style={{ color: form.discount_type === type ? colors.primary : colors.textSecondary }}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {form.discount_type === 'percentage' ? (
          <Input
            label="Discount %"
            value={form.discount_percent}
            onChangeText={(t) => setForm((f) => ({ ...f, discount_percent: t }))}
            keyboardType="number-pad"
            error={isDiscountPercentInvalid ? 'Enter a value between 1 and 100' : undefined}
          />
        ) : (
          <Input
            label="Discount amount (₹)"
            value={form.discount_amount}
            onChangeText={(t) => setForm((f) => ({ ...f, discount_amount: t }))}
            keyboardType="number-pad"
            error={isDiscountAmountInvalid ? 'Enter a positive discount amount' : undefined}
          />
        )}

        <Input
          label={form.discount_type === 'flat' ? 'Minimum order value (₹)' : 'Minimum order value (₹, optional)'}
          value={form.min_order_value}
          onChangeText={(t) => setForm((f) => ({ ...f, min_order_value: t }))}
          keyboardType="number-pad"
          placeholder="No minimum"
          error={isMinOrderValueInvalid ? 'Must be greater than the discount amount' : undefined}
        />

        <Input
          label="Max uses, platform-wide (optional)"
          value={form.max_uses}
          onChangeText={(t) => setForm((f) => ({ ...f, max_uses: t }))}
          keyboardType="number-pad"
          placeholder="Unlimited"
        />

        <DateField
          label="Valid from (optional)"
          value={form.valid_from || null}
          onChange={(d) => setForm((f) => ({ ...f, valid_from: d }))}
          maximumDate={form.valid_until ? new Date(`${form.valid_until}T00:00:00`) : undefined}
          placeholder="Starts immediately"
        />

        <DateField
          label="Valid until (optional)"
          value={form.valid_until || null}
          onChange={(d) => setForm((f) => ({ ...f, valid_until: d }))}
          minimumDate={form.valid_from ? new Date(`${form.valid_from}T00:00:00`) : undefined}
          placeholder="No expiry"
        />

        {editingItem ? (
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text }}>Active</Text>
            <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
          </View>
        ) : null}
        {editingItem ? (
          <Pressable onPress={() => setDeleteTarget(editingItem)} className="items-center mb-3">
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              Delete Offer
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Offer"
        message="Permanently delete this offer? This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.Id);
          setDeleteTarget(null);
          setSheetVisible(false);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
