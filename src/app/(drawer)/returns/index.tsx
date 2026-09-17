import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { Card, ConfirmModal, EmptyState, Header, Pressable, SkeletonList } from '@/components/ui';
import {
  useAcceptReturnBroadcastMutation,
  useDeclineReturnBroadcastMutation,
  useReturnBroadcastOffers,
} from '@/features/returns/hooks/useReturns';
import { useSetEmployeeOnlineStatusMutation } from '@/features/deliveries/hooks/useDeliveries';
import { useEmployeeOnlineStatus } from '@/features/pickups/hooks/usePickups';
import { useLocation } from '@/hooks/useLocation';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { t as translate } from '@/i18n';
import type { ReturnBroadcastOffer } from '@/types/returns';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';
import { formatDistanceKm, haversineDistanceKm } from '@/utils/geo';
import { LocationRow, itemsLabel, openMap, useCountdown } from '@/features/broadcasts/offerCardHelpers';

// Return-pickup queue: the reverse leg of a cancelled order where the tailor
// already had the fabric/garment in hand at cancel time. Same broadcast/
// FCFS-accept mechanics and same tailor -> customer geography as
// deliveries/index.tsx (this screen is a close structural mirror of it) -
// only the order status/intent differs. Once accepted, the in-transit/
// complete steps happen from the order detail screen (orders/[id].tsx),
// since a return stays assigned to one employee across those steps rather
// than being re-broadcast.

const OfferCard = ({
  offer,
  onAccept,
  onDeclinePress,
  onPress,
  accepting,
  declining,
  myCoords,
}: {
  offer: ReturnBroadcastOffer;
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
            {t('returns.returnOrder')}
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
          label={t('returns.pickupTailor')}
          addressLine={offer.pickup?.location ?? t('returns.locationNotAvailable')}
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
          label={t('returns.dropCustomer')}
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
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>
              {accepting ? t('pendingOffer.accepting') : t('pickups.accept')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default function ReturnsScreen() {
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

  const { data, isLoading, isError, error, refetch, isRefetching } = useReturnBroadcastOffers(isOnline);
  const acceptMutation = useAcceptReturnBroadcastMutation();
  const declineMutation = useDeclineReturnBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<ReturnBroadcastOffer | null>(null);
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

  const handleAccept = (offer: ReturnBroadcastOffer) => {
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
      <Header title={t('returns.title')} subtitle={isOnline ? t('pickups.pendingOffers', { count: offers.length }) : t('pickups.youAreOffline')} />
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
              {isOnline ? t('returns.willReceiveOffers') : t('returns.goOnlineHint')}
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
            icon="return-up-back-outline"
            title={t('pickups.youreOffline')}
            description={t('returns.toggleOnlineHint')}
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
                icon="return-up-back-outline"
                title={t('pickups.noPendingOffers')}
                description={t('returns.newOffersWillAppear')}
              />
            }
          />
        )}
      </View>

      <ConfirmModal
        visible={!!declineTarget}
        title={t('pickups.declineOfferTitle')}
        message={t('returns.declineOfferMessage')}
        confirmLabel={t('pickups.decline')}
        loading={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </View>
  );
}
