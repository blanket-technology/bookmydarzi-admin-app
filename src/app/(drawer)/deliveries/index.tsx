import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, Switch, Text, View } from 'react-native';
import { Card, ConfirmModal, EmptyState, Header, Pressable, SkeletonList } from '@/components/ui';
import {
  useAcceptDeliveryBroadcastMutation,
  useDeclineDeliveryBroadcastMutation,
  useDeliveryBroadcastOffers,
  useSetEmployeeOnlineStatusMutation,
} from '@/features/deliveries/hooks/useDeliveries';
import { useEmployeeOnlineStatus } from '@/features/pickups/hooks/usePickups';
import { useLocation } from '@/hooks/useLocation';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { t as translate } from '@/i18n';
import type { DeliveryBroadcastOffer } from '@/types/deliveries';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';
import { formatDistanceKm, haversineDistanceKm } from '@/utils/geo';

const useCountdown = (expiresAt?: string | null) => {
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

const openMap = (latitude?: number | null, longitude?: number | null, label?: string) => {
  if (latitude == null || longitude == null) return;
  const query = encodeURIComponent(label ?? `${latitude},${longitude}`);
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${query}`).catch(
    () => {},
  );
};

const callNumber = (mobile?: string | null) => {
  if (!mobile) return;
  Linking.openURL(`tel:${mobile}`).catch(() => {});
};

const itemsLabel = (items?: { service_name?: string | null; category_name?: string | null; quantity: number }[]) => {
  if (!items || items.length === 0) return null;
  return items
    .map((it) => {
      const name = it.service_name ?? it.category_name ?? translate('orderItems.item');
      return it.quantity > 1 ? `${name} × ${it.quantity}` : name;
    })
    .join(', ');
};

const LocationRow = ({
  icon,
  iconColor,
  label,
  addressLine,
  personName,
  mobile,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  addressLine: string;
  personName?: string | null;
  mobile?: string | null;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="py-1.5">
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-start">
      <Ionicons name={icon} size={15} color={iconColor} style={{ marginTop: 1 }} />
      <View className="flex-1 ml-2">
        <Text className="text-[11px] font-semibold uppercase" style={{ color: colors.textMuted }}>
          {label}
        </Text>
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

const OfferCard = ({
  offer,
  onAccept,
  onDeclinePress,
  onPress,
  accepting,
  declining,
  myCoords,
}: {
  offer: DeliveryBroadcastOffer;
  onAccept: () => void;
  onDeclinePress: () => void;
  onPress: () => void;
  accepting: boolean;
  declining: boolean;
  myCoords: { latitude: number; longitude: number } | null;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const countdown = useCountdown(offer.expires_at);
  const isExpired = countdown === t('pickups.expired');

  const dropLine = offer.drop
    ? [offer.drop.address_line_1, offer.drop.address_line_2, offer.drop.city, offer.drop.pincode]
        .filter(Boolean)
        .join(', ')
    : null;

  // Distance to the pickup-from-tailor leg, since that's where the employee
  // starts this job - the drop (customer) distance is shown as part of the
  // route itself, not the "how far to start" decision signal.
  const distanceLabel =
    myCoords && offer.pickup?.latitude != null && offer.pickup?.longitude != null
      ? formatDistanceKm(
          haversineDistanceKm(myCoords.latitude, myCoords.longitude, offer.pickup.latitude, offer.pickup.longitude),
        )
      : null;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl p-4 mb-3 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {t('deliveries.deliveryOrder')}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {offer.order_code ?? t('pickups.orderHash', { id: offer.order_id })}
          </Text>
        </View>
        <View className="items-end" style={{ gap: 4 }}>
          {distanceLabel ? (
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                {distanceLabel}
              </Text>
            </View>
          ) : null}
          {offer.broadcast_round ? (
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {t('broadcastMonitor.round', { round: offer.broadcast_round })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="rounded-2xl p-3 mt-1" style={{ backgroundColor: colors.background }}>
        <LocationRow
          icon="cut-outline"
          iconColor={colors.primary}
          label={t('deliveries.pickupTailor')}
          addressLine={offer.pickup?.location ?? t('deliveries.locationNotAvailable')}
          personName={offer.pickup?.tailor_name}
          mobile={offer.pickup?.tailor_mobile}
          onPress={
            offer.pickup?.latitude != null
              ? () => openMap(offer.pickup?.latitude, offer.pickup?.longitude, offer.pickup?.location ?? undefined)
              : undefined
          }
          colors={colors}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
        <LocationRow
          icon="location-outline"
          iconColor={colors.error}
          label={t('deliveries.dropCustomer')}
          addressLine={dropLine || t('pickups.addressNotAvailable')}
          personName={offer.drop?.full_name}
          mobile={offer.drop?.mobile}
          onPress={
            offer.drop?.latitude != null
              ? () => openMap(offer.drop?.latitude, offer.drop?.longitude, dropLine ?? undefined)
              : undefined
          }
          colors={colors}
        />
      </View>

      {itemsLabel(offer.items) ? (
        <View className="flex-row items-start mt-2">
          <Ionicons name="shirt-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text className="text-xs ml-1.5 flex-1" style={{ color: colors.textSecondary }} numberOfLines={2}>
            {itemsLabel(offer.items)}
          </Text>
        </View>
      ) : null}

      {offer.notified_at ? (
        <View className="flex-row items-center mt-2">
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
            {t('broadcastMonitor.notified', { date: formatDate(offer.notified_at) })}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <Text className="text-xs font-semibold" style={{ color: isExpired ? colors.error : colors.primary }}>
          {countdown}
        </Text>
        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDeclinePress();
            }}
            disabled={declining || accepting || isExpired}
            className="px-4 py-2 rounded-xl border"
            style={{ borderColor: colors.border, opacity: declining || isExpired ? 0.5 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
              {t('pickups.decline')}
            </Text>
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            disabled={accepting || declining || isExpired}
            className="px-4 py-2 rounded-xl"
            style={{ backgroundColor: colors.primary, opacity: accepting || isExpired ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold text-white">
              {accepting ? t('pendingOffer.accepting') : t('pickups.accept')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default function DeliveriesScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const location = useLocation();
  const setOnlineStatus = useSetEmployeeOnlineStatusMutation();
  // Seeded from real server state below - previously hardcoded false on
  // every mount, so an employee already online server-side (via a prior
  // session's manual toggle, or useAutoOnline) still saw "offline" here and
  // the offers query stayed disabled, hiding every pending broadcast.
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const { data: serverOnlineStatus, isSuccess: hasServerOnlineStatus } = useEmployeeOnlineStatus();

  useEffect(() => {
    if (hasServerOnlineStatus && serverOnlineStatus) {
      setIsOnline(serverOnlineStatus.is_online);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasServerOnlineStatus, serverOnlineStatus?.is_online]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useDeliveryBroadcastOffers(isOnline);
  const acceptMutation = useAcceptDeliveryBroadcastMutation();
  const declineMutation = useDeclineDeliveryBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<DeliveryBroadcastOffer | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const offers = data?.broadcasts ?? [];

  // Mirrors pickups/index.tsx - if seeded online from server state above,
  // this screen's own GPS watch was never started (only handleToggleOnline
  // calls location.start()), so an already-online employee's location
  // silently never refreshes here.
  useEffect(() => {
    if (isOnline && !location.isWatching) {
      location.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Keep the backend's last-known location fresh every time the device's
  // watch position fires while online — same "stay findable while online"
  // guarantee the tailor side gets from its own online toggle.
  useEffect(() => {
    if (!isOnline || !location.coords) return;
    setOnlineStatus.mutate({
      is_online: true,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, location.coords?.latitude, location.coords?.longitude]);

  const handleToggleOnline = async (next: boolean) => {
    setTogglingOnline(true);
    try {
      if (next) {
        const started = await location.start();
        if (!started) {
          setTogglingOnline(false);
          return;
        }
        await setOnlineStatus.mutateAsync({
          is_online: true,
          latitude: location.coords?.latitude,
          longitude: location.coords?.longitude,
        });
        setIsOnline(true);
      } else {
        await setOnlineStatus.mutateAsync({ is_online: false });
        location.stop();
        setIsOnline(false);
      }
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAccept = (offer: DeliveryBroadcastOffer) => {
    setActingOrderId(offer.order_id);
    acceptMutation.mutate(offer.order_id, { onSettled: () => setActingOrderId(null) });
  };

  const handleConfirmDecline = () => {
    if (!declineTarget) return;
    setActingOrderId(declineTarget.order_id);
    declineMutation.mutate(declineTarget.order_id, {
      onSettled: () => setActingOrderId(null),
    });
    setDeclineTarget(null);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={t('deliveries.title')} subtitle={isOnline ? t('pickups.pendingOffers', { count: offers.length }) : t('pickups.youAreOffline')} />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <Card className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: isOnline ? colors.success : colors.textMuted }}
              />
              <Text className="font-bold text-base" style={{ color: colors.text }}>
                {isOnline ? t('dashboard.online') : t('dashboard.offline')}
              </Text>
            </View>
            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {isOnline
                ? t('deliveries.willReceiveOffers')
                : t('deliveries.goOnlineHint')}
            </Text>
            {location.error ? (
              <Text className="text-xs mt-1" style={{ color: colors.error }}>
                {location.error}
              </Text>
            ) : null}
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            disabled={togglingOnline}
            trackColor={{ true: colors.primary }}
          />
        </Card>

        {!isOnline ? (
          <EmptyState
            icon="bicycle-outline"
            title={t('pickups.youreOffline')}
            description={t('deliveries.toggleOnlineHint')}
          />
        ) : isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <EmptyState
            title={t('pickups.failedToLoadOffers')}
            description={formatApiErrorDetail(error)}
            actionLabel={t('common.retry')}
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) => item.broadcast_id}
            renderItem={({ item }) => (
              <OfferCard
                offer={item}
                onAccept={() => handleAccept(item)}
                onDeclinePress={() => setDeclineTarget(item)}
                onPress={() => router.push(`/(drawer)/orders/${item.order_id}`)}
                accepting={acceptMutation.isPending && actingOrderId === item.order_id}
                declining={declineMutation.isPending && actingOrderId === item.order_id}
                myCoords={location.coords}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="bicycle-outline"
                title={t('pickups.noPendingOffers')}
                description={t('deliveries.newOffersWillAppear')}
              />
            }
          />
        )}
      </View>

      <ConfirmModal
        visible={!!declineTarget}
        title={t('pickups.declineOfferTitle')}
        message={t('deliveries.declineOfferMessage')}
        confirmLabel={t('pickups.decline')}
        loading={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </View>
  );
}
