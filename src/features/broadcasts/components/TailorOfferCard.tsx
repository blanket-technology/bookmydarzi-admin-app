import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Modal, Pressable } from '@/components/ui';
import { hasExpired, useCountdown } from '@/features/broadcasts/offerCardHelpers';
import { DetailRow } from '@/features/orders/components/DetailRow';
import { useTheme } from '@/hooks/useTheme';
import type { BroadcastItem, BroadcastOffer } from '@/types/broadcasts';
import { capitalize, formatDate } from '@/utils/errors';

// Re-exported for any other file still importing useCountdown from here -
// this card previously defined its own duplicate copy (buggy in a
// different, unrelated way: fine on its own, but a second source of truth
// for the same logic). Now a single shared implementation
// (offerCardHelpers.tsx), same one the Bridge/employee offer cards use.
export { useCountdown };

const MEASUREMENT_FIELDS: { key: keyof NonNullable<BroadcastItem['measurement']>; label: string; unit?: string }[] = [
  { key: 'chest', label: 'Chest', unit: 'in' },
  { key: 'waist', label: 'Waist', unit: 'in' },
  { key: 'hips', label: 'Hips', unit: 'in' },
  { key: 'shoulder', label: 'Shoulder', unit: 'in' },
  { key: 'neck', label: 'Neck', unit: 'in' },
  { key: 'sleeve_length', label: 'Sleeve Length', unit: 'in' },
  { key: 'inseam', label: 'Inseam', unit: 'in' },
  { key: 'height', label: 'Height', unit: 'in' },
];

/** One garment within the offer - image, gender, notes, addons and full
 * measurements, everything the tailor actually needs to judge and later
 * stitch the job. Deliberately no customer identity or price - see
 * broadcast.py's _privacy_safe_order docstring. */
const GarmentItemCard = ({
  item,
  index,
  onViewReferencePhoto,
  onViewGarmentImage,
}: {
  item: BroadcastItem;
  index: number;
  onViewReferencePhoto: (url: string) => void;
  onViewGarmentImage: (url: string) => void;
}) => {
  const { colors } = useTheme();
  const m = item.measurement;

  return (
    <View className="rounded-2xl p-3 mb-2 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="flex-row">
        {item.image_url ? (
          <Pressable onPress={() => onViewGarmentImage(item.image_url!)}>
            <Image
              source={{ uri: item.image_url }}
              className="w-20 h-20 rounded-xl mr-3"
              style={{ backgroundColor: colors.card }}
              resizeMode="cover"
            />
          </Pressable>
        ) : (
          <View
            className="w-20 h-20 rounded-xl mr-3 items-center justify-center"
            style={{ backgroundColor: colors.card }}
          >
            <Ionicons name="shirt-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {item.service_name ?? `Garment ${index + 1}`}
            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
          </Text>
          <View className="flex-row items-center flex-wrap mt-1" style={{ gap: 6 }}>
            {item.category_name ? (
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {item.category_name}
              </Text>
            ) : null}
            {item.gender ? (
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                <Text className="text-[10px] font-semibold uppercase" style={{ color: colors.primary }}>
                  {capitalize(item.gender)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {item.notes ? (
        <Text className="text-xs mt-2" style={{ color: colors.textSecondary }}>
          Note: {item.notes}
        </Text>
      ) : null}

      {item.reference_photo_url ? (
        <Pressable
          onPress={() => onViewReferencePhoto(item.reference_photo_url!)}
          className="flex-row items-center mt-2 px-2.5 py-1.5 rounded-xl self-start"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <Ionicons name="image-outline" size={14} color={colors.primary} />
          <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
            View reference photo
          </Text>
        </Pressable>
      ) : null}

      {item.addons && item.addons.length > 0 ? (
        <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          Add-ons: {item.addons.map((a) => a.name).join(', ')}
        </Text>
      ) : null}

      {m ? (
        <View className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
          {MEASUREMENT_FIELDS.filter((f) => m[f.key] != null).map((f) => (
            <DetailRow key={f.key} label={f.label} value={`${m[f.key]} ${f.unit ?? ''}`.trim()} colors={colors} />
          ))}
          {m.fit_preference ? (
            <DetailRow label="Fit Preference" value={capitalize(m.fit_preference)} colors={colors} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

/** Tailor broadcast offer card - extracted unchanged from
 * (drawer)/broadcasts/index.tsx so IncomingBroadcastModal.tsx (the
 * full-screen popup) can render an identical card instead of inventing a
 * second visual language for the same data. */
export const TailorOfferCard = ({
  offer,
  onAccept,
  onDeclinePress,
  accepting,
  declining,
}: {
  offer: BroadcastOffer;
  onAccept: () => void;
  onDeclinePress: () => void;
  accepting: boolean;
  declining: boolean;
}) => {
  const { colors } = useTheme();
  const countdown = useCountdown(offer.expires_at);
  const isExpired = hasExpired(offer.expires_at);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Real job name instead of a redundant "Tailoring Order" label (a tailor
  // knows this is a tailoring order - the screen it's on already tells
  // them that). The first garment's own name when there's one item; a
  // plain count + first name when there's more than one, so the header is
  // never empty filler text on a multi-item/cart order (where the
  // order-level service_name is legitimately null).
  const firstItemName = offer.items?.[0]?.service_name;
  const headline =
    offer.garment_count > 1 && firstItemName
      ? `${offer.garment_count} items — ${firstItemName}`
      : (firstItemName ?? offer.service_name ?? `${offer.garment_count} garment${offer.garment_count === 1 ? '' : 's'}`);

  // Plain-language deadline instead of a "TAT"/urgency-tier badge a tailor
  // isn't trained on vocabulary for - just when the finished garment needs
  // to be ready, in their own words.
  const tatDays = offer.tat_days;
  const tatIsTight = tatDays != null && tatDays <= 1;
  const tatLabel =
    tatDays == null
      ? null
      : tatDays === 0
        ? 'Finish today'
        : `Finish within ${tatDays} day${tatDays === 1 ? '' : 's'}`;

  return (
    <View className="rounded-3xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="mb-2">
        <Text className="font-bold text-lg" style={{ color: colors.text }}>
          {headline}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
          {offer.order_code ?? `Order #${offer.order_id}`}
        </Text>
      </View>

      {tatLabel ? (
        <View
          className="flex-row items-center self-start px-2.5 py-1 rounded-full mb-2"
          style={{ backgroundColor: tatIsTight ? '#fee2e2' : colors.primaryLight }}
        >
          <Ionicons name="timer-outline" size={13} color={tatIsTight ? '#dc2626' : colors.primary} />
          <Text className="text-xs font-semibold ml-1" style={{ color: tatIsTight ? '#dc2626' : colors.primary }}>
            {tatLabel}
          </Text>
        </View>
      ) : null}

      {offer.items && offer.items.length > 0 ? (
        <View className="mb-1">
          {offer.items.map((item, index) => (
            <GarmentItemCard
              key={index}
              item={item}
              index={index}
              onViewReferencePhoto={setPreviewUrl}
              onViewGarmentImage={setPreviewUrl}
            />
          ))}
        </View>
      ) : null}

      {offer.expected_delivery_date ? (
        <View className="flex-row items-center mb-1">
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
            Deliver by {formatDate(offer.expected_delivery_date)}
          </Text>
        </View>
      ) : null}

      {offer.description || offer.fabric_notes || offer.customization_notes || offer.cloth_details || offer.stitching_preferences ? (
        <View className="mt-2 p-3 rounded-2xl" style={{ backgroundColor: colors.surface }}>
          {offer.description ? (
            <Text className="text-xs mb-1" style={{ color: colors.text }}>
              {offer.description}
            </Text>
          ) : null}
          {offer.fabric_notes ? (
            <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              Fabric: {offer.fabric_notes}
            </Text>
          ) : null}
          {offer.customization_notes ? (
            <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              Customization: {offer.customization_notes}
            </Text>
          ) : null}
          {offer.cloth_details ? (
            <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              Cloth: {offer.cloth_details}
            </Text>
          ) : null}
          {offer.stitching_preferences && Object.keys(offer.stitching_preferences).length > 0 ? (
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              Design notes:{' '}
              {Object.entries(offer.stitching_preferences)
                // reference_photo_url is rendered as an actual photo below
                // instead - showing it here too would duplicate it as a raw,
                // unclickable URL string.
                .filter(([key]) => key !== 'reference_photo_url')
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </Text>
          ) : null}
          {offer.reference_photo_url ? (
            <Pressable
              onPress={() => setPreviewUrl(offer.reference_photo_url!)}
              className="flex-row items-center mt-2 px-2.5 py-1.5 rounded-xl self-start"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="image-outline" size={14} color={colors.primary} />
              <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
                View reference photo
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <Text className="text-xs font-semibold" style={{ color: isExpired ? colors.error : colors.primary }}>
          {countdown}
        </Text>
        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={onDeclinePress}
            disabled={declining || accepting || isExpired}
            className="px-4 py-2 rounded-xl border"
            style={{ borderColor: colors.border, opacity: declining || isExpired ? 0.5 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
              Decline
            </Text>
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={accepting || declining || isExpired}
            className="px-4 py-2 rounded-xl"
            style={{ backgroundColor: colors.primary, opacity: accepting || isExpired ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>{accepting ? 'Accepting…' : 'Accept'}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Photo">
        {previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
            resizeMode="contain"
          />
        ) : null}
      </Modal>
    </View>
  );
};
