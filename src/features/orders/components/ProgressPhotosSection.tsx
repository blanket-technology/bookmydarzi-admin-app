import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Loader, Modal, Pressable } from '@/components/ui';
import { ORDER_STATUS } from '@/constants/orderStatus';
import {
  useOrderPhotos,
  useUploadProgressPhotoMutation,
} from '@/features/orders/hooks/useProgressPhotos';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import type { OrderStatus } from '@/types/orders';
import type { ProgressPhotoStage } from '@/types/progressPhotos';
import { formatDateTime } from '@/utils/errors';

// Mirrors _PHOTO_UPLOAD_STAGES in app/api/v1/endpoints/orders.py — the
// backend rejects uploads outside this window, so the upload button is
// gated on the same set client-side to avoid a doomed request.
const PHOTO_UPLOAD_STAGES: OrderStatus[] = [
  ORDER_STATUS.STITCHING_STARTED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.FINAL_CHECK,
];

interface ProgressPhotosSectionProps {
  orderId: string;
  orderStatus: OrderStatus | string;
  isTailor: boolean;
}

// Tailor: upload + view (backend has no DELETE endpoint for progress photos
// — see app/api/v1/endpoints/orders.py, so delete is intentionally not
// offered here). Employee/Admin: view only, per backend authorization
// (get_order_photos permits staff and the assigned tailor to see all
// photos; upload_order_photo is require_roles(TAILOR) only).
export const ProgressPhotosSection = ({
  orderId,
  orderStatus,
  isTailor,
}: ProgressPhotosSectionProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { isLargeScreen } = useResponsive();
  const thumbSize = isLargeScreen ? 132 : 96;
  const [expanded, setExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { data, isLoading, isError } = useOrderPhotos(orderId, expanded);
  const uploadMutation = useUploadProgressPhotoMutation(orderId);

  const canUpload = isTailor && PHOTO_UPLOAD_STAGES.includes(orderStatus as OrderStatus);
  const photos = data?.photos ?? [];
  const [uploadingCount, setUploadingCount] = useState(0);

  // Backend has no batch-upload endpoint (upload_order_photo takes exactly
  // one UploadFile per call) - picking multiple here just means calling
  // that same single-file mutation once per selected photo, sequentially
  // (not parallel) so a failure partway through doesn't leave the tailor
  // unsure which of several concurrent requests actually landed. Mirrors
  // UpdateProgressSheet.tsx's identical sequenced-upload pattern.
  const handlePickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('progressPhotos.permissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets?.length) return;

    // Default the photo's stage to the order's current status — these
    // stages are already the only ones canUpload allows, so the value is
    // always a valid ProgressPhotoStage.
    const stage = PHOTO_UPLOAD_STAGES.includes(orderStatus as OrderStatus)
      ? (orderStatus as ProgressPhotoStage)
      : 'in_progress';

    setUploadingCount(result.assets.length);
    try {
      for (const asset of result.assets) {
        await uploadMutation.mutateAsync({
          uri: asset.uri,
          fileName: asset.fileName ?? undefined,
          mimeType: asset.mimeType ?? 'image/jpeg',
          stage,
        });
      }
    } catch {
      // The upload mutation already toasted the reason; remaining photos are
      // skipped so the user can retry deliberately.
    } finally {
      setUploadingCount(0);
    }
  };

  return (
    <Card className="mb-4">
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="images-outline" size={18} color={colors.text} />
          <Text className="text-base font-semibold" style={{ color: colors.text }}>
            {t('progressPhotos.title')}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View className="mt-4">
          {isLoading ? (
            <Loader message={t('progressPhotos.loadingPhotos')} />
          ) : isError ? (
            <Text className="text-sm py-2" style={{ color: colors.textSecondary }}>
              {t('progressPhotos.couldNotLoad')}
            </Text>
          ) : photos.length === 0 ? (
            <Text className="text-sm py-2" style={{ color: colors.textSecondary }}>
              {t('progressPhotos.noPhotosYet')}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 mb-2">
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setPreviewUrl(photo.photo_url)}
                  className="mx-1"
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={{ width: thumbSize, height: thumbSize, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <Text
                    className="text-xs mt-1 text-center"
                    style={{ color: colors.textSecondary, width: thumbSize }}
                    numberOfLines={1}
                  >
                    {photo.stage.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {canUpload ? (
            <Button
              title={t('progressPhotos.uploadPhoto')}
              variant="outline"
              onPress={handlePickAndUpload}
              loading={uploadingCount > 0}
              fullWidth
            />
          ) : null}
        </View>
      ) : null}

      <Modal visible={!!previewUrl} onClose={() => setPreviewUrl(null)} title={t('progressPhotos.modalTitle')}>
        {previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
            contentFit="contain"
          />
        ) : null}
        {previewUrl
          ? (() => {
              const photo = photos.find((p) => p.photo_url === previewUrl);
              return photo ? (
                <View className="mt-3">
                  {photo.caption ? (
                    <Text className="text-sm mb-1" style={{ color: colors.text }}>
                      {photo.caption}
                    </Text>
                  ) : null}
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {formatDateTime(photo.uploaded_at ?? undefined)}
                  </Text>
                </View>
              ) : null;
            })()
          : null}
      </Modal>
    </Card>
  );
};
