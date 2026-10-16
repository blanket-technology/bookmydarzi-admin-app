import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Pressable } from '@/components/ui';
import { useUpdateStitchingStatusMutation } from '@/features/orders/hooks/useOrders';
import { useUploadProgressPhotoMutation } from '@/features/orders/hooks/useProgressPhotos';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import type { ProgressPhotoStage } from '@/types/progressPhotos';

interface PickedPhoto {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

interface UpdateProgressSheetProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  /** The status this action moves the order TO (in_progress or
   * final_check) - also the stage the picked photo(s) are tagged with,
   * matching what ProgressPhotosSection.tsx would default to for an upload
   * made while the order is at that stage. */
  nextStage: ProgressPhotoStage;
  nextStageLabel: string;
}

const MAX_PHOTOS = 5;

// Opened by "Update Progress" / "Send for Final Check" (useOrderActions.ts)
// instead of firing the status change immediately - lets the tailor
// optionally attach one or more progress photos first. Photos are never
// required: tapping Continue with none picked behaves exactly like the old
// direct-mutation button. Reuses the exact upload mutation/picker call
// ProgressPhotosSection.tsx already established, and the existing
// tailorStitchingMutation for the status change itself - no new backend
// endpoint, no new upload logic.
export const UpdateProgressSheet = ({
  visible,
  onClose,
  orderId,
  nextStage,
  nextStageLabel,
}: UpdateProgressSheetProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { isLargeScreen } = useResponsive();
  const thumbSize = isLargeScreen ? 104 : 80;
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const uploadMutation = useUploadProgressPhotoMutation(orderId);
  const statusMutation = useUpdateStitchingStatusMutation();

  const reset = () => {
    setPhotos([]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePick = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('progressPhotos.permissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
      selectionLimit: MAX_PHOTOS - photos.length,
      allowsMultipleSelection: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets.slice(0, MAX_PHOTOS - photos.length).map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    setPhotos((prev) => [...prev, ...picked]);
  };

  const handleRemove = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Sequenced, not parallel: if a photo upload fails, the status change
      // never fires, so the tailor doesn't end up with the order advanced
      // but a missing photo they thought they'd attached.
      for (const photo of photos) {
        await uploadMutation.mutateAsync({
          uri: photo.uri,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          stage: nextStage,
        });
        // Uploaded photos are visible to the customer: drop each one from the
        // list as soon as it lands so a retry after a later failure does not
        // upload (and show) it a second time.
        setPhotos((prev) => prev.filter((p) => p.uri !== photo.uri));
      }
      await statusMutation.mutateAsync({ orderId, payload: { status: nextStage } });
      handleClose();
    } catch {
      // Individual mutations already toast their own error (see
      // useUploadProgressPhotoMutation / useUpdateStitchingStatusMutation) -
      // just stop here so the sheet stays open for the tailor to retry.
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={nextStageLabel}
      footer={
        <Button
          title={photos.length > 0 ? t('updateProgress.uploadAndContinue') : t('updateProgress.continueWithoutPhoto')}
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
        />
      }
    >
      <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        {t('updateProgress.hint')}
      </Text>

      {photos.length > 0 ? (
        <View className="flex-row flex-wrap mb-3" style={{ gap: 8 }}>
          {photos.map((photo) => (
            <View key={photo.uri}>
              <Image source={{ uri: photo.uri }} style={{ width: thumbSize, height: thumbSize, borderRadius: 12 }} contentFit="cover" />
              <Pressable
                onPress={() => handleRemove(photo.uri)}
                hitSlop={8}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.error }}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {photos.length < MAX_PHOTOS ? (
        <Pressable
          onPress={handlePick}
          className="flex-row items-center justify-center rounded-2xl py-3 mb-4 border border-dashed"
          style={{ borderColor: colors.border }}
        >
          <Ionicons name="camera-outline" size={18} color={colors.primary} />
          <Text className="text-sm font-semibold ml-2" style={{ color: colors.primary }}>
            {t('updateProgress.addPhoto')}
          </Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
};
