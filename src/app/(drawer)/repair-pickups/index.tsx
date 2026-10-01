import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { Card, ConfirmModal, EmptyState, Header, Pressable, SkeletonList } from '@/components/ui';
import {
  useAcceptRepairPickupBroadcastMutation,
  useDeclineRepairPickupBroadcastMutation,
  useRepairPickupBroadcastOffers,
} from '@/features/repairPickups/hooks/useRepairPickups';
import { useSetEmployeeOnlineStatusMutation } from '@/features/deliveries/hooks/useDeliveries';
import { useEmployeeOnlineStatus } from '@/features/pickups/hooks/usePickups';
import { useLocation } from '@/hooks/useLocation';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { RepairPickupBroadcastOffer } from '@/types/repairPickups';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';
import { formatDistanceKm, haversineDistanceKm } from '@/utils/geo';
import { LocationRow, itemsLabel, openMap, useCountdown } from '@/features/broadcasts/offerCardHelpers';

// Repair-pickup queue: the garment is physically at the customer's home and
// needs to go back to the tailor after an issue is reported during the
// post-delivery inspection window. Same broadcast/FCFS-accept mechanics as
// the original pickup leg, same customer -> tailor geography. Once
// accepted, the in-transit/delivered-to-tailor steps happen from the order
// detail screen (orders/[id].tsx).

const OfferCard = ({
  offer,
  onAccept,
  onDeclinePress,
  onPress,
  accepting,
  declining,
  myCoords,
}: {
  offer: RepairPickupBroadcastOffer;
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

  const pickupLine = offer.pickup
    ? [offer.pickup.address_line_1, offer.pickup.address_line_2, offer.pickup.city, offer.pickup.pincode]
        .filter(Boolean)
        .join(', ')
    : null;

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
            {t('repairPickups.repairPickupOrder')}
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
          icon="location-outline"
          iconColor={colors.primary}
          label={t('repairPickups.pickupCustomer')}
          addressLine={pickupLine || t('pickups.addressNotAvailable')}
          personName={offer.pickup?.full_name}
          mobile={offer.pickup?.mobile}
          onPress={
            offer.pickup?.latitude != null
              ? () => openMap(offer.pickup?.latitude, offer.pickup?.longitude, pickupLine ?? undefined)
              : undefined
          }
          colors={colors}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
        <LocationRow
          icon="cut-outline"
          iconColor={colors.error}
          label={t('repairPickups.dropTailor')}
          addressLine={offer.drop?.location ?? t('repairPickups.locationNotAvailable')}
          personName={offer.drop?.tailor_name}
          mobile={offer.drop?.tailor_mobile}
          onPress={
            offer.drop?.latitude != null
              ? () => openMap(offer.drop?.latitude, offer.drop?.longitude, offer.drop?.location ?? undefined)
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
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>
              {accepting ? t('pendingOffer.accepting') : t('pickups.accept')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default function RepairPickupsScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const location = useLocation();
  const setOnlineStatus = useSetEmployeeOnlineStatusMutation();
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const { data: serverOnlineStatus, isSuccess: hasServerOnlineStatus } = useEmployeeOnlineStatus();

  useEffect(() => {
    if (hasServerOnlineStatus && serverOnlineStatus) {
      setIsOnline(serverOnlineStatus.is_online);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasServerOnlineStatus, serverOnlineStatus?.is_online]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useRepairPickupBroadcastOffers(isOnline);
  const acceptMutation = useAcceptRepairPickupBroadcastMutation();
  const declineMutation = useDeclineRepairPickupBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<RepairPickupBroadcastOffer | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const offers = data?.broadcasts ?? [];

  useEffect(() => {
    if (isOnline && !location.isWatching) {
      location.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

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

  const handleAccept = (offer: RepairPickupBroadcastOffer) => {
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
      <Header
        title={t('repairPickups.title')}
        subtitle={isOnline ? t('pickups.pendingOffers', { count: offers.length }) : t('pickups.youAreOffline')}
      />
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
              {isOnline ? t('repairPickups.willReceiveOffers') : t('repairPickups.goOnlineHint')}
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
            icon="construct-outline"
            title={t('pickups.youreOffline')}
            description={t('repairPickups.toggleOnlineHint')}
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
                icon="construct-outline"
                title={t('pickups.noPendingOffers')}
                description={t('repairPickups.newOffersWillAppear')}
              />
            }
          />
        )}
      </View>

      <ConfirmModal
        visible={!!declineTarget}
        title={t('pickups.declineOfferTitle')}
        message={t('repairPickups.declineOfferMessage')}
        confirmLabel={t('pickups.decline')}
        loading={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </View>
  );
}
