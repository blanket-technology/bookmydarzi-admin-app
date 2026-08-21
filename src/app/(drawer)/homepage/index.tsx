import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, ConfirmModal, EmptyState, Header, Input, Loader, Pressable, ScreenContent } from '@/components/ui';
import {
  useBanners,
  useClearHomepageCacheMutation,
  useCreateBannerMutation,
  useCreateOfferMutation,
  useDeleteBannerMutation,
  useDeleteOfferMutation,
  useOffers,
  useUpdateBannerMutation,
  useUpdateOfferMutation,
} from '@/features/homepage/hooks/useHomepage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import type { Banner, DiscountType, Offer } from '@/types/homepage';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

type Tab = 'banners' | 'offers';

const EMPTY_BANNER_FORM = { title: '', subtitle: '', image_url: '', redirect_url: '', display_order: '0' };
const EMPTY_OFFER_FORM = {
  title: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_percent: '0',
  discount_amount: '',
  coupon_code: '',
  image_url: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

export default function HomepageScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('banners');

  const { data: banners, isLoading: bannersLoading, isError: bannersError, error: bannersErr, refetch: refetchBanners } = useBanners(tab === 'banners');
  const { data: offers, isLoading: offersLoading, isError: offersError, error: offersErr, refetch: refetchOffers } = useOffers(tab === 'offers');

  const createBannerMutation = useCreateBannerMutation();
  const updateBannerMutation = useUpdateBannerMutation();
  const deleteBannerMutation = useDeleteBannerMutation();
  const createOfferMutation = useCreateOfferMutation();
  const updateOfferMutation = useUpdateOfferMutation();
  const deleteOfferMutation = useDeleteOfferMutation();
  const clearCacheMutation = useClearHomepageCacheMutation();

  const [bannerSheetVisible, setBannerSheetVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [deleteBannerTarget, setDeleteBannerTarget] = useState<Banner | null>(null);

  const [offerSheetVisible, setOfferSheetVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER_FORM);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<Offer | null>(null);

  const openNewBanner = () => {
    setEditingBanner(null);
    setBannerForm(EMPTY_BANNER_FORM);
    setBannerSheetVisible(true);
  };
  const openEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.Title,
      subtitle: banner.Subtitle ?? '',
      image_url: banner.ImageUrl ?? '',
      redirect_url: banner.RedirectUrl ?? '',
      display_order: String(banner.DisplayOrder),
    });
    setBannerSheetVisible(true);
  };
  const handleSaveBanner = () => {
    if (!bannerForm.title.trim()) return;
    const payload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle || undefined,
      image_url: bannerForm.image_url || undefined,
      redirect_url: bannerForm.redirect_url || undefined,
      display_order: Number(bannerForm.display_order) || 0,
    };
    if (editingBanner) {
      updateBannerMutation.mutate(
        { id: editingBanner.Id, payload },
        { onSuccess: () => setBannerSheetVisible(false) },
      );
    } else {
      createBannerMutation.mutate(payload, { onSuccess: () => setBannerSheetVisible(false) });
    }
  };

  const openNewOffer = () => {
    setEditingOffer(null);
    setOfferForm(EMPTY_OFFER_FORM);
    setOfferSheetVisible(true);
  };
  const openEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.Title,
      description: offer.Description ?? '',
      discount_type: offer.DiscountType ?? 'percentage',
      discount_percent: String(offer.DiscountPercent ?? 0),
      discount_amount: offer.DiscountAmount != null ? String(offer.DiscountAmount) : '',
      coupon_code: offer.CouponCode ?? '',
      image_url: offer.ImageUrl ?? '',
      valid_from: offer.ValidFrom ? offer.ValidFrom.slice(0, 10) : '',
      valid_until: offer.ValidUntil ? offer.ValidUntil.slice(0, 10) : '',
      is_active: offer.IsActive,
    });
    setOfferSheetVisible(true);
  };
  const handleSaveOffer = () => {
    if (!offerForm.title.trim()) return;
    if (offerForm.valid_from && offerForm.valid_until && offerForm.valid_from >= offerForm.valid_until) {
      toast.error('Start date must be before expiry date.');
      return;
    }
    // discount_amount is only meaningful/required for 'flat' (backend's
    // OfferCreate/OfferUpdate validators reject a flat offer with no
    // amount); discount_percent likewise only applies to 'percentage'.
    const payload = {
      title: offerForm.title.trim(),
      description: offerForm.description || undefined,
      discount_type: offerForm.discount_type,
      discount_percent:
        offerForm.discount_type === 'percentage' ? Number(offerForm.discount_percent) || 0 : undefined,
      discount_amount:
        offerForm.discount_type === 'flat' ? Number(offerForm.discount_amount) || undefined : undefined,
      coupon_code: offerForm.coupon_code || undefined,
      image_url: offerForm.image_url || undefined,
      valid_from: offerForm.valid_from ? new Date(offerForm.valid_from).toISOString() : undefined,
      valid_until: offerForm.valid_until ? new Date(offerForm.valid_until).toISOString() : undefined,
      is_active: offerForm.is_active,
    };
    if (editingOffer) {
      updateOfferMutation.mutate(
        { id: editingOffer.Id, payload },
        { onSuccess: () => setOfferSheetVisible(false) },
      );
    } else {
      createOfferMutation.mutate(payload, { onSuccess: () => setOfferSheetVisible(false) });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Homepage"
        subtitle="Banners & offers"
        rightAction={
          <Pressable
            onPress={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text} />
          </Pressable>
        }
      />
      <View className="px-5 pt-3 flex-row" style={{ gap: 10 }}>
        {(['banners', 'offers'] as Tab[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => setTab(option)}
            className="flex-1 items-center justify-center rounded-2xl py-2.5 border"
            style={{
              backgroundColor: tab === option ? colors.primary : colors.surface,
              borderColor: tab === option ? colors.primary : colors.border,
            }}
          >
            <Text className="font-semibold text-sm capitalize" style={{ color: tab === option ? '#fff' : colors.text }}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'banners' ? (
        <ScreenContent style={{ marginTop: 12 }}>
          {bannersLoading ? (
            <Loader message="Loading banners..." />
          ) : bannersError ? (
            <EmptyState title="Failed to load banners" description={formatApiErrorDetail(bannersErr)} actionLabel="Retry" onAction={() => refetchBanners()} />
          ) : !banners || banners.length === 0 ? (
            <EmptyState icon="image-outline" title="No banners yet" />
          ) : (
            banners.map((banner) => (
              <Card key={banner.Id} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-bold flex-1 mr-2" style={{ color: colors.text }}>
                    {banner.Title}
                  </Text>
                  <Badge
                    label={banner.IsActive ? 'Active' : 'Inactive'}
                    backgroundColor={banner.IsActive ? '#dcfce7' : '#fee2e2'}
                    color={banner.IsActive ? '#16a34a' : '#dc2626'}
                  />
                </View>
                {banner.Subtitle ? (
                  <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                    {banner.Subtitle}
                  </Text>
                ) : null}
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  Order {banner.DisplayOrder} · {formatDate(banner.CreatedAt)}
                </Text>
                <View className="flex-row mt-3" style={{ gap: 10 }}>
                  <Pressable onPress={() => openEditBanner(banner)} className="flex-row items-center">
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.primary }}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setDeleteBannerTarget(banner)} className="flex-row items-center">
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.error }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
          <Button title="Add Banner" variant="outline" onPress={openNewBanner} className="my-3" fullWidth />
        </ScreenContent>
      ) : (
        <ScreenContent style={{ marginTop: 12 }}>
          {offersLoading ? (
            <Loader message="Loading offers..." />
          ) : offersError ? (
            <EmptyState title="Failed to load offers" description={formatApiErrorDetail(offersErr)} actionLabel="Retry" onAction={() => refetchOffers()} />
          ) : !offers || offers.length === 0 ? (
            <EmptyState icon="pricetag-outline" title="No offers yet" />
          ) : (
            offers.map((offer) => (
              <Card key={offer.Id} className="mb-3" style={!offer.IsActive ? { opacity: 0.6 } : undefined}>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-bold flex-1 mr-2" style={{ color: colors.text }}>
                    {offer.Title}
                  </Text>
                  <Badge
                    label={
                      offer.DiscountType === 'flat'
                        ? `₹${offer.DiscountAmount ?? 0} off`
                        : `${offer.DiscountPercent}% off`
                    }
                    backgroundColor={colors.primaryLight}
                    color={colors.primary}
                  />
                </View>
                {offer.Description ? (
                  <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                    {offer.Description}
                  </Text>
                ) : null}
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {offer.CouponCode ? `Code: ${offer.CouponCode} · ` : ''}
                  {offer.ValidFrom && new Date(offer.ValidFrom).getTime() > Date.now()
                    ? `Starts ${formatDate(offer.ValidFrom)} · `
                    : ''}
                  {offer.ValidUntil ? `Expires ${formatDate(offer.ValidUntil)} · ` : ''}
                  {offer.IsActive ? 'Active' : 'Inactive'}
                </Text>
                <View className="flex-row items-center mt-3" style={{ gap: 10 }}>
                  <Pressable onPress={() => openEditOffer(offer)} className="flex-row items-center">
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.primary }}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateOfferMutation.mutate({ id: offer.Id, payload: { is_active: !offer.IsActive } })
                    }
                    className="flex-row items-center"
                  >
                    <Ionicons
                      name={offer.IsActive ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                      {offer.IsActive ? 'Disable' : 'Enable'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setDeleteOfferTarget(offer)} className="flex-row items-center">
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.error }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
          <Button title="Add Offer" variant="outline" onPress={openNewOffer} className="my-3" fullWidth />
        </ScreenContent>
      )}

      <BottomSheet
        visible={bannerSheetVisible}
        onClose={() => setBannerSheetVisible(false)}
        title={editingBanner ? 'Edit Banner' : 'New Banner'}
      >
        <Input label="Title" value={bannerForm.title} onChangeText={(t) => setBannerForm((f) => ({ ...f, title: t }))} />
        <Input label="Subtitle" value={bannerForm.subtitle} onChangeText={(t) => setBannerForm((f) => ({ ...f, subtitle: t }))} />
        <Input label="Image URL" value={bannerForm.image_url} onChangeText={(t) => setBannerForm((f) => ({ ...f, image_url: t }))} autoCapitalize="none" />
        <Input label="Redirect URL" value={bannerForm.redirect_url} onChangeText={(t) => setBannerForm((f) => ({ ...f, redirect_url: t }))} autoCapitalize="none" />
        <Input label="Display Order" value={bannerForm.display_order} onChangeText={(t) => setBannerForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
        <Button
          title={editingBanner ? 'Save Changes' : 'Create Banner'}
          onPress={handleSaveBanner}
          loading={createBannerMutation.isPending || updateBannerMutation.isPending}
          disabled={!bannerForm.title.trim()}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet
        visible={offerSheetVisible}
        onClose={() => setOfferSheetVisible(false)}
        title={editingOffer ? 'Edit Offer' : 'New Offer'}
      >
        <Input label="Title" value={offerForm.title} onChangeText={(t) => setOfferForm((f) => ({ ...f, title: t }))} />
        <Input label="Description" value={offerForm.description} onChangeText={(t) => setOfferForm((f) => ({ ...f, description: t }))} multiline />

        <Text className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
          Discount Type
        </Text>
        <View className="flex-row gap-2 mb-4">
          {(['percentage', 'flat'] as DiscountType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => setOfferForm((f) => ({ ...f, discount_type: type }))}
              className="flex-1 items-center py-2.5 rounded-xl border"
              style={{
                backgroundColor: offerForm.discount_type === type ? colors.primary : colors.surface,
                borderColor: offerForm.discount_type === type ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: offerForm.discount_type === type ? '#fff' : colors.text }}
              >
                {type === 'percentage' ? 'Percentage' : 'Flat Amount'}
              </Text>
            </Pressable>
          ))}
        </View>

        {offerForm.discount_type === 'percentage' ? (
          <Input
            label="Discount %"
            value={offerForm.discount_percent}
            onChangeText={(t) => setOfferForm((f) => ({ ...f, discount_percent: t }))}
            keyboardType="decimal-pad"
          />
        ) : (
          <Input
            label="Discount Amount (₹)"
            value={offerForm.discount_amount}
            onChangeText={(t) => setOfferForm((f) => ({ ...f, discount_amount: t }))}
            keyboardType="decimal-pad"
          />
        )}

        <Input label="Coupon Code (optional)" value={offerForm.coupon_code} onChangeText={(t) => setOfferForm((f) => ({ ...f, coupon_code: t }))} autoCapitalize="characters" />
        <Input label="Image URL" value={offerForm.image_url} onChangeText={(t) => setOfferForm((f) => ({ ...f, image_url: t }))} autoCapitalize="none" />
        <Input
          label="Starts On (YYYY-MM-DD, optional)"
          value={offerForm.valid_from}
          onChangeText={(t) => setOfferForm((f) => ({ ...f, valid_from: t }))}
          placeholder="Defaults to today"
          autoCapitalize="none"
        />
        <Input
          label="Expires On (YYYY-MM-DD, optional)"
          value={offerForm.valid_until}
          onChangeText={(t) => setOfferForm((f) => ({ ...f, valid_until: t }))}
          placeholder="2026-12-31"
          autoCapitalize="none"
        />

        <View className="flex-row items-center justify-between py-2 mb-3">
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            Active
          </Text>
          <Switch
            value={offerForm.is_active}
            onValueChange={(v) => setOfferForm((f) => ({ ...f, is_active: v }))}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Button
          title={editingOffer ? 'Save Changes' : 'Create Offer'}
          onPress={handleSaveOffer}
          loading={createOfferMutation.isPending || updateOfferMutation.isPending}
          disabled={!offerForm.title.trim()}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteBannerTarget}
        title="Delete Banner"
        message={`Remove "${deleteBannerTarget?.Title}"? This can't be undone.`}
        confirmLabel="Delete"
        loading={deleteBannerMutation.isPending}
        onConfirm={() => {
          if (deleteBannerTarget) deleteBannerMutation.mutate(deleteBannerTarget.Id);
          setDeleteBannerTarget(null);
        }}
        onCancel={() => setDeleteBannerTarget(null)}
      />

      <ConfirmModal
        visible={!!deleteOfferTarget}
        title="Delete Offer"
        message={`Remove "${deleteOfferTarget?.Title}"? This can't be undone.`}
        confirmLabel="Delete"
        loading={deleteOfferMutation.isPending}
        onConfirm={() => {
          if (deleteOfferTarget) deleteOfferMutation.mutate(deleteOfferTarget.Id);
          setDeleteOfferTarget(null);
        }}
        onCancel={() => setDeleteOfferTarget(null)}
      />
    </View>
  );
}
