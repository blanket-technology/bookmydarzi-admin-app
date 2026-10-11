import { setManuallyOffline } from '@/hooks/useAutoOnline';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Card, ConfirmModal, EmptyState, Header, Pressable, SkeletonList } from '@/components/ui';
import {
  useAcceptPickupBroadcastMutation,
  useDeclinePickupBroadcastMutation,
  useEmployeeOnlineStatus,
  usePickupBroadcastOffers,
  useSetPickupOnlineStatusMutation,
} from '@/features/pickups/hooks/usePickups';
import { useLocation } from '@/hooks/useLocation';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { t as translate } from '@/i18n';
import { useResponsive } from '@/hooks/useResponsive';
import type { PickupBroadcastOffer } from '@/types/pickups';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';
import { formatDistanceKm, haversineDistanceKm } from '@/utils/geo';
import { BridgeTaskList } from '@/features/tasks/components/TaskLists';
import { callNumber, itemsLabel, openMap, useCountdown } from '@/features/broadcasts/offerCardHelpers';

const OfferCard = ({
  offer,
  onAccept,
  onDeclinePress,
  onPress,
  accepting,
  declining,
  myCoords,
}: {
  offer: PickupBroadcastOffer;
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

  // Client-side, unlike the tailor broadcast feed's server-computed
  // distance_km - staff already receive exact pickup coordinates (this is a
  // job already offered to vetted staff, not a pre-accept customer-privacy
  // situation), and the employee's own GPS is already tracked locally via
  // useLocation for the online-status heartbeat, so no backend round trip
  // is needed to show it.
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
            {t('pickups.pickupOrder')}
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
        <Pressable
          onPress={
            offer.pickup?.latitude != null
              ? () => openMap(offer.pickup?.latitude, offer.pickup?.longitude)
              : undefined
          }
          disabled={offer.pickup?.latitude == null}
          className="flex-row items-start py-1.5"
        >
          <Ionicons name="location-outline" size={15} color={colors.primary} style={{ marginTop: 1 }} />
          <View className="flex-1 ml-2">
            <Text className="text-[11px] font-semibold uppercase" style={{ color: colors.textMuted }}>
              {t('pickups.pickupCustomer')}
            </Text>
            <Text className="text-sm mt-0.5" style={{ color: colors.text }} numberOfLines={2}>
              {pickupLine || t('pickups.addressNotAvailable')}
            </Text>
            {offer.pickup?.full_name ? (
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {offer.pickup.full_name}
              </Text>
            ) : null}
          </View>
          {offer.pickup?.latitude != null ? (
            <Ionicons name="navigate-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
          ) : null}
        </Pressable>
        {offer.pickup?.mobile ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              callNumber(offer.pickup?.mobile);
            }}
            className="flex-row items-center self-start mt-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="call-outline" size={13} color={colors.primary} />
            <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
              {t('pickups.call', { mobile: offer.pickup.mobile })}
            </Text>
          </Pressable>
        ) : null}
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
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>{accepting ? t('pendingOffer.accepting') : t('pickups.accept')}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default function PickupsScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const queryClient = useQueryClient();
  const location = useLocation();
  const setOnlineStatus = useSetPickupOnlineStatusMutation();
  // Local UI toggle, but SEEDED from real server state below - previously
  // this started at a hardcoded false on every mount, so an employee who
  // was already online server-side (via the manual toggle in a prior
  // session, or via useAutoOnline) still saw "You're offline" and the
  // offers query stayed disabled until they toggled again. That silently
  // hid every pending broadcast from a genuinely-online employee.
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const { data: serverOnlineStatus, isSuccess: hasServerOnlineStatus } = useEmployeeOnlineStatus();

  useEffect(() => {
    if (hasServerOnlineStatus && serverOnlineStatus) {
      setIsOnline(serverOnlineStatus.is_online);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasServerOnlineStatus, serverOnlineStatus?.is_online]);

  const { data, isLoading, isError, error, refetch, isRefetching } = usePickupBroadcastOffers(isOnline);
  const acceptMutation = useAcceptPickupBroadcastMutation();
  const declineMutation = useDeclinePickupBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<PickupBroadcastOffer | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const offers = data?.broadcasts ?? [];

  // If seeded online from server state (above), this screen's own GPS
  // watch was never started - handleToggleOnline is the only other place
  // that calls location.start(). Without this, an already-online employee
  // opening the screen shows "Online" but silently never refreshes their
  // location server-side (location.coords stays null, so the effect below
  // never fires either).
  useEffect(() => {
    if (isOnline && !location.isWatching) {
      location.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Keep the backend's last-known location fresh while online — same
  // "stay findable" guarantee the delivery/tailor sides get.
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
        setManuallyOffline(false);
        toast.success("You're online");
      } else {
        await setOnlineStatus.mutateAsync({ is_online: false });
        location.stop();
        setIsOnline(false);
        setManuallyOffline(true);
        toast.success("You're offline");
      }
    } catch {
      // setOnlineStatus's own onError already shows a toast - this catch
      // just prevents the mutateAsync rejection from surfacing as an
      // unhandled promise rejection once `finally` runs.
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAccept = (offer: PickupBroadcastOffer) => {
    setActingOrderId(offer.order_id);
    acceptMutation.mutate(offer.order_id, { onSettled: () => setActingOrderId(null) });
  };

  const handleConfirmDecline = () => {
    if (!declineTarget) return;
    setActingOrderId(declineTarget.order_id);
    declineMutation.mutate(declineTarget.order_id, { onSettled: () => setActingOrderId(null) });
    setDeclineTarget(null);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={t('pickups.title')} subtitle={isOnline ? t('pickups.pendingOffers', { count: offers.length }) : t('pickups.youAreOffline')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['orders'] });
            }}
            tintColor={colors.primary}
          />
        }
      >
      <View className="px-5 w-full" style={{ maxWidth: contentMaxWidth }}>
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
                ? t('pickups.willReceiveOffers')
                : t('pickups.goOnlineHint')}
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

        {/* Jobs already claimed by this person are shown regardless of online
            state: going offline stops NEW offers, it must not hide work in hand. */}
        <BridgeTaskList kinds={['pickup', 'handover']} title={t('tasks.myPickups')} hideEmpty />

        <Text className="text-base font-bold mb-3 mt-1" style={{ color: colors.text }}>
          {t('tasks.offers')}
        </Text>

        {!isOnline ? (
          <EmptyState
            icon="cube-outline"
            title={t('pickups.youreOffline')}
            description={t('pickups.toggleOnlineHint')}
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
          offers.length === 0 ? (
<EmptyState
                            icon="cube-outline"
                            title={t('pickups.noPendingOffers')}
                            description={t('pickups.newOffersWillAppear')}
                          />
          ) : (
            <View>
              {offers.map((item) => (
                <View key={item.broadcast_id}>
<OfferCard
                                offer={item}
                                onAccept={() => handleAccept(item)}
                                onDeclinePress={() => setDeclineTarget(item)}
                                onPress={() => router.push(`/(drawer)/orders/${item.order_id}`)}
                                accepting={acceptMutation.isPending && actingOrderId === item.order_id}
                                declining={declineMutation.isPending && actingOrderId === item.order_id}
                                myCoords={location.coords}
                              />
                </View>
              ))}
            </View>
          )
        )}
      </View>
      </ScrollView>

      <ConfirmModal
        visible={!!declineTarget}
        title={t('pickups.declineOfferTitle')}
        message={t('pickups.declineOfferMessage')}
        confirmLabel={t('pickups.decline')}
        loading={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </View>
  );
}
