import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { t as translate } from '@/i18n';

// Shared rendering helpers for pickup/delivery/return broadcast offer cards -
// extracted from deliveries/index.tsx (previously duplicated per-screen) so
// pickups/index.tsx, returns/index.tsx, and the new full-screen
// IncomingOfferModal.tsx all render offers identically instead of drifting
// into three slightly-different visual languages.

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
        setLabel(translate('pickups.expired'));
        return;
      }
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setLabel(
        mins > 0
          ? translate('pickups.timeLeftMinSec', { mins, secs })
          : translate('pickups.timeLeftSec', { secs }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return label;
};

export const openMap = (latitude?: number | null, longitude?: number | null, label?: string) => {
  if (latitude == null || longitude == null) return;
  const query = encodeURIComponent(label ?? `${latitude},${longitude}`);
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${query}`).catch(
    () => {},
  );
};

export const callNumber = (mobile?: string | null) => {
  if (!mobile) return;
  Linking.openURL(`tel:${mobile}`).catch(() => {});
};

export const itemsLabel = (
  items?: { service_name?: string | null; category_name?: string | null; quantity: number }[],
) => {
  if (!items || items.length === 0) return null;
  return items
    .map((it) => {
      const name = it.service_name ?? it.category_name ?? translate('orderItems.item');
      return it.quantity > 1 ? `${name} × ${it.quantity}` : name;
    })
    .join(', ');
};

export const LocationRow = ({
  icon,
  iconColor,
  label,
  addressLine,
  personName,
  mobile,
  distanceKm,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  addressLine: string;
  personName?: string | null;
  mobile?: string | null;
  // Distance for THIS leg specifically (e.g. employee -> pickup, or
  // pickup -> drop) - rendered prominently next to the label, matching the
  // Rapido/Swiggy-style "0.1 km" / "14 km" per-leg convention instead of a
  // single trip-wide distance shown only once.
  distanceKm?: number | null;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="py-1.5">
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-start">
      <Ionicons name={icon} size={15} color={iconColor} style={{ marginTop: 1 }} />
      <View className="flex-1 ml-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-semibold uppercase" style={{ color: colors.textMuted }}>
            {label}
          </Text>
          {distanceKm != null ? (
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              {distanceKm} km
            </Text>
          ) : null}
        </View>
        <Text className="text-sm mt-0.5" style={{ color: colors.text }} numberOfLines={2}>
          {addressLine}
        </Text>
        {personName ? (
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {personName}
          </Text>
        ) : null}
      </View>
      {onPress ? <Ionicons name="navigate-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} /> : null}
    </Pressable>
    {mobile ? (
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          callNumber(mobile);
        }}
        className="flex-row items-center self-start mt-1.5 ml-6 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name="call-outline" size={13} color={colors.primary} />
        <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
          {translate('pickups.call', { mobile: mobile ?? '' })}
        </Text>
      </Pressable>
    ) : null}
  </View>
);
