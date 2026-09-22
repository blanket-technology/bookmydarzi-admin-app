import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Card, Modal, Pressable } from '@/components/ui';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { capitalize } from '@/utils/errors';
import { DetailRow } from './DetailRow';

/** Play/pause chip for the order's voice note (if any) - lets a tailor who
 * reads slowly listen to the customer's spoken instructions instead of
 * relying on typed notes alone. */
const VoiceNoteChip = ({ url, colors, label }: { url: string; colors: any; label: string }) => {
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      className="flex-row items-center mb-4 px-2.5 py-1.5 rounded-xl self-start"
      style={{ backgroundColor: colors.primaryLight }}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={14} color={colors.primary} />
      <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
        {label}
      </Text>
    </Pressable>
  );
};

/** Single-item measurement snapshot card. Shows the recorded values once
 * present; for a tailor with nothing recorded yet, shows the "Bridge
 * collects this at pickup" explainer instead. Extracted unchanged from
 * orders/[id].tsx. Only rendered by the parent for single-item orders -
 * multi-item orders use OrderItemsCard's per-item fill/update flow instead. */
export const OrderMeasurementCard = ({
  order,
  isTailorRole,
}: {
  order: AdminOrderItem;
  isTailorRole: boolean;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Single-item orders don't render OrderItemsCard (see that component's
  // own docstring), so this is the only card that gets a chance to show
  // what add-ons were selected - without it the tailor/bridge had no way
  // to see "+ Button Replacement" etc. on a one-item order at all.
  const addons = order.items?.[0]?.addons;
  // Same reasoning: a single-item order's reference photo lives at
  // order.reference_photo_url (top-level), not per-item - see that field's
  // own docstring in types/orders.ts.
  const referencePhotoUrl = order.reference_photo_url ?? order.items?.[0]?.reference_photo_url ?? null;
  const voiceNoteUrl = order.voice_note_url ?? null;

  const addonsBlock =
    addons && addons.length > 0 ? (
      <View className="mb-4">
        {addons.map((addon, idx) => (
          <Text key={addon.addon_id ?? idx} className="text-xs" style={{ color: colors.primary }}>
            + {addon.name}
            {addon.note ? ` (${addon.note})` : ''}
          </Text>
        ))}
      </View>
    ) : null;

  const referencePhotoBlock = referencePhotoUrl ? (
    <Pressable
      onPress={() => setPreviewUrl(referencePhotoUrl)}
      className="flex-row items-center mb-4 px-2.5 py-1.5 rounded-xl self-start"
      style={{ backgroundColor: colors.primaryLight }}
    >
      <Ionicons name="image-outline" size={14} color={colors.primary} />
      <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
        {t('orderItems.viewReferencePhoto')}
      </Text>
    </Pressable>
  ) : null;

  const voiceNoteBlock = voiceNoteUrl ? (
    <VoiceNoteChip url={voiceNoteUrl} colors={colors} label={t('orderItems.playVoiceNote')} />
  ) : null;

  const photoModal = (
    <Modal visible={!!previewUrl} onClose={() => setPreviewUrl(null)} title={t('orderItems.referencePhoto')}>
      {previewUrl ? (
        <Image
          source={{ uri: previewUrl }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          resizeMode="contain"
        />
      ) : null}
    </Modal>
  );

  if (!order.measurement) {
    // Previously returned null outright for non-tailor roles when no
    // measurement existed yet, which also hid any selected add-ons from
    // Admin/Superadmin/Employee - add-ons are relevant to everyone, not
    // just the "measurement not collected" explainer, so render the card
    // whenever there's an addons block even if measurements aren't ready.
    if (!isTailorRole && !addonsBlock && !referencePhotoBlock && !voiceNoteBlock) return null;
    return (
      <Card className="mb-4">
        <Text className="font-bold mb-1" style={{ color: colors.text }}>
          {t('measurement.title')}
        </Text>
        {isTailorRole ? (
          <Text className="text-sm mb-2" style={{ color: colors.textMuted }}>
            {t('measurement.notCollectedYet')}
          </Text>
        ) : null}
        {addonsBlock}
        {referencePhotoBlock}
        {voiceNoteBlock}
        {photoModal}
      </Card>
    );
  }

  const m = order.measurement;
  return (
    <Card className="mb-4">
      <Text className="font-bold mb-2" style={{ color: colors.text }}>
        {t('measurement.title')}
      </Text>
      {addonsBlock}
      {referencePhotoBlock}
      {voiceNoteBlock}
      <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {m.profile_name}
      </Text>
      {m.chest != null ? <DetailRow label={t('measurement.chest')} value={`${m.chest} in`} colors={colors} /> : null}
      {m.waist != null ? <DetailRow label={t('measurement.waist')} value={`${m.waist} in`} colors={colors} /> : null}
      {m.hips != null ? <DetailRow label={t('measurement.hips')} value={`${m.hips} in`} colors={colors} /> : null}
      {m.shoulder != null ? <DetailRow label={t('measurement.shoulder')} value={`${m.shoulder} in`} colors={colors} /> : null}
      {m.neck != null ? <DetailRow label={t('measurement.neck')} value={`${m.neck} in`} colors={colors} /> : null}
      {m.sleeve_length != null ? <DetailRow label={t('measurement.sleeveLength')} value={`${m.sleeve_length} in`} colors={colors} /> : null}
      {m.inseam != null ? <DetailRow label={t('measurement.inseam')} value={`${m.inseam} in`} colors={colors} /> : null}
      {m.height != null ? <DetailRow label={t('measurement.height')} value={`${m.height} in`} colors={colors} /> : null}
      {m.fit_preference ? <DetailRow label={t('measurement.fitPreference')} value={capitalize(m.fit_preference)} colors={colors} /> : null}
      {m.notes ? <DetailRow label={t('measurement.notes')} value={m.notes} colors={colors} /> : null}
      {photoModal}
    </Card>
  );
};
