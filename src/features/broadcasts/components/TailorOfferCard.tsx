import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { BroadcastOffer } from '@/types/broadcasts';
import { capitalize, formatDate } from '@/utils/errors';
import { formatDistanceKm } from '@/utils/geo';

const URGENCY_BADGE: Record<string, { bg: string; color: string }> = {
  standard: { bg: '#FBF3DF', color: '#7D622A' },
  urgent: { bg: '#fef3c7', color: '#d97706' },
  express: { bg: '#fee2e2', color: '#dc2626' },
};

export const useCountdown = (expiresAt?: string | null) => {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!expiresAt) {
      setLabel('');
      return;
    }
    const update = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setLabel('Expired');
        return;
      }
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setLabel(mins > 0 ? `${mins}m ${secs}s left` : `${secs}s left`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return label;
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
  const urgency = URGENCY_BADGE[offer.urgency_level ?? 'standard'] ?? URGENCY_BADGE.standard;
  const isExpired = countdown === 'Expired';

  const tatDays = offer.tat_days;
  const tatIsTight = tatDays != null && tatDays <= 1;
  const tatLabel =
    tatDays == null
      ? null
      : tatDays === 0
        ? 'Due today'
        : `${tatDays} day${tatDays === 1 ? '' : 's'} to complete`;

  return (
    <View className="rounded-3xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {offer.service_name ?? 'Tailoring Order'}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {offer.category_name ? `${offer.category_name} · ` : ''}
            {offer.order_code ?? `Order #${offer.order_id}`}
          </Text>
        </View>
        <Badge label={capitalize(offer.urgency_level ?? 'standard')} backgroundColor={urgency.bg} color={urgency.color} />
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

      <View className="flex-row items-center mb-1">
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
          {offer.pickup_area ?? 'Area unavailable'}
        </Text>
        {formatDistanceKm(offer.distance_km) ? (
          <>
            <Text className="text-sm mx-1" style={{ color: colors.textMuted }}>
              ·
            </Text>
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              {formatDistanceKm(offer.distance_km)}
            </Text>
          </>
        ) : null}
      </View>
      <View className="flex-row items-center mb-1">
        <Ionicons name="shirt-outline" size={14} color={colors.textSecondary} />
        <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
          {offer.garment_count} garment{offer.garment_count === 1 ? '' : 's'}
        </Text>
      </View>
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
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </Text>
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
            <Text className="text-sm font-semibold text-white">{accepting ? 'Accepting…' : 'Accept'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
