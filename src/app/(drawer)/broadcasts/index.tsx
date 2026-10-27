import { setManuallyOffline } from '@/hooks/useAutoOnline';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { Card, ConfirmModal, EmptyState, Header, SkeletonList } from '@/components/ui';
import { TailorOfferCard } from '@/features/broadcasts/components/TailorOfferCard';
import {
  useAcceptBroadcastMutation,
  useBroadcastOffers,
  useDeclineBroadcastMutation,
  useSetTailorOnlineStatusMutation,
} from '@/features/broadcasts/hooks/useBroadcasts';
import { useMyTailorProfile } from '@/features/tailors/hooks/useTailors';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from '@/store/toastStore';
import type { BroadcastOffer } from '@/types/broadcasts';
import { formatApiErrorDetail } from '@/utils/errors';

export default function BroadcastsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const location = useLocation();
  const setOnlineStatus = useSetTailorOnlineStatusMutation();
  // Seeded from real server state below - previously hardcoded false on
  // every mount, so a tailor already online server-side (via a prior
  // session's manual toggle, or useAutoOnline) still saw "offline" here
  // and the offers query stayed disabled, hiding every pending broadcast.
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const { data: tailorProfile, isSuccess: hasTailorProfile } = useMyTailorProfile();

  useEffect(() => {
    if (hasTailorProfile && tailorProfile) {
      setIsOnline(tailorProfile.IsOnline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTailorProfile, tailorProfile?.IsOnline]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useBroadcastOffers(
    { limit: 50 },
    isOnline,
  );
  const acceptMutation = useAcceptBroadcastMutation();
  const declineMutation = useDeclineBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<BroadcastOffer | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const offers = data?.broadcasts ?? [];

  // Mirrors pickups/deliveries - if seeded online from server state above,
  // this screen's own GPS watch was never started, so an already-online
  // tailor's location silently never refreshes here.
  useEffect(() => {
    if (isOnline && !location.isWatching) {
      location.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Keep the backend's last-known location fresh every time the device's
  // watch position fires while online — same pattern as the employee side's
  // Deliveries screen (deliveries/index.tsx), which this mirrors.
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
      // exists only so the mutateAsync rejection doesn't surface as an
      // unhandled promise rejection once `finally` runs (it previously had
      // no catch at all, so the rejection propagated past this handler on
      // every failed toggle, e.g. a network blip).
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAccept = (offer: BroadcastOffer) => {
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
      <Header title="Broadcasts" subtitle={isOnline ? `${offers.length} pending offers` : 'You are offline'} />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <Card className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: isOnline ? colors.success : colors.textMuted }}
              />
              <Text className="font-bold text-base" style={{ color: colors.text }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {isOnline
                ? 'You will receive nearby order offers.'
                : 'Go online to start receiving order offers.'}
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
            icon="radio-outline"
            title="You're offline"
            description="Toggle online above to start receiving nearby order offers."
          />
        ) : isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <EmptyState
            title="Failed to load offers"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) => item.broadcast_id}
            renderItem={({ item }) => (
              <TailorOfferCard
                offer={item}
                onAccept={() => handleAccept(item)}
                onDeclinePress={() => setDeclineTarget(item)}
                accepting={acceptMutation.isPending && actingOrderId === item.order_id}
                declining={declineMutation.isPending && actingOrderId === item.order_id}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="radio-outline"
                title="No pending offers"
                description="New order broadcasts in your area will appear here."
              />
            }
          />
        )}
      </View>

      <ConfirmModal
        visible={!!declineTarget}
        title="Decline Offer"
        message={`Decline this order offer? It will be sent to the next available tailor.`}
        confirmLabel="Decline"
        loading={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </View>
  );
}
