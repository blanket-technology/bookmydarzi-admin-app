import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, ConfirmModal, EmptyState, Header, Input, Loader, Pressable, ScreenContent } from '@/components/ui';
import {
  useBanners,
  useClearHomepageCacheMutation,
  useCreateBannerMutation,
  useDeleteBannerMutation,
  useUpdateBannerMutation,
  useUploadBannerImageMutation,
} from '@/features/homepage/hooks/useHomepage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import type { Banner } from '@/types/homepage';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const EMPTY_BANNER_FORM = { title: '', subtitle: '', image_url: '', redirect_url: '', display_order: '0' };

// Offers used to live here as a second tab, backed by the exact same
// /api/v1/admin/homepage/offers endpoints as the dedicated Offers & Coupons
// screen (features/offers) - a stale duplicate with plain-text "YYYY-MM-DD"
// date inputs instead of that screen's real calendar pickers, and no reason
// to exist as a second place to manage the same data. Removed entirely;
// Offers & Coupons is the single place for offer CRUD now.
export default function HomepageScreen() {
  const { colors } = useTheme();

  const { data: banners, isLoading: bannersLoading, isError: bannersError, error: bannersErr, refetch: refetchBanners } = useBanners();

  const createBannerMutation = useCreateBannerMutation();
  const updateBannerMutation = useUpdateBannerMutation();
  const deleteBannerMutation = useDeleteBannerMutation();
  const clearCacheMutation = useClearHomepageCacheMutation();
  const uploadImageMutation = useUploadBannerImageMutation();

  const [bannerSheetVisible, setBannerSheetVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [deleteBannerTarget, setDeleteBannerTarget] = useState<Banner | null>(null);

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
  const pickAndUploadBannerImage = async () => {
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
      { onSuccess: (res) => setBannerForm((f) => ({ ...f, image_url: res.url })) },
    );
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Homepage"
        subtitle="Banners"
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

      <BottomSheet
        visible={bannerSheetVisible}
        onClose={() => setBannerSheetVisible(false)}
        title={editingBanner ? 'Edit Banner' : 'New Banner'}
        footer={
          <Button
            title={editingBanner ? 'Save Changes' : 'Create Banner'}
            onPress={handleSaveBanner}
            loading={createBannerMutation.isPending || updateBannerMutation.isPending}
            disabled={!bannerForm.title.trim()}
            fullWidth
          />
        }
      >
        <Input label="Title" value={bannerForm.title} onChangeText={(t) => setBannerForm((f) => ({ ...f, title: t }))} />
        <Input label="Subtitle" value={bannerForm.subtitle} onChangeText={(t) => setBannerForm((f) => ({ ...f, subtitle: t }))} />
        {bannerForm.image_url ? (
          <Image
            source={{ uri: bannerForm.image_url }}
            style={{ width: '100%', aspectRatio: 2, borderRadius: 16, marginBottom: 12 }}
            contentFit="cover"
          />
        ) : null}
        <Button
          title="Pick Image"
          variant="outline"
          className="mb-4"
          loading={uploadImageMutation.isPending}
          onPress={pickAndUploadBannerImage}
          fullWidth
        />
        <Input
          label="Image URL (or paste a link instead)"
          value={bannerForm.image_url}
          onChangeText={(t) => setBannerForm((f) => ({ ...f, image_url: t }))}
          autoCapitalize="none"
        />
        <Input label="Redirect URL" value={bannerForm.redirect_url} onChangeText={(t) => setBannerForm((f) => ({ ...f, redirect_url: t }))} autoCapitalize="none" />
        <Input label="Display Order" value={bannerForm.display_order} onChangeText={(t) => setBannerForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
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
    </View>
  );
}
