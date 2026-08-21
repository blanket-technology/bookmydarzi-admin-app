import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { Badge, Card, ConfirmModal, EmptyState, Header, Pressable, SkeletonList } from '@/components/ui';
import {
  useAcceptBroadcastMutation,
  useBroadcastOffers,
  useDeclineBroadcastMutation,
  useSetTailorOnlineStatusMutation,
} from '@/features/broadcasts/hooks/useBroadcasts';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { BroadcastOffer } from '@/types/broadcasts';
import { capitalize, formatApiErrorDetail, formatDate } from '@/utils/errors';

const URGENCY_BADGE: Record<string, { bg: string; color: string }> = {
  standard: { bg: '#FBF3DF', color: '#7D622A' },
  urgent: { bg: '#fef3c7', color: '#d97706' },
  express: { bg: '#fee2e2', color: '#dc2626' },
};

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

const OfferCard = ({
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

  return (
    <View className="rounded-3xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {offer.service_name ?? 'Tailoring Order'}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {offer.order_code ?? `Order #${offer.order_id}`}
          </Text>
        </View>
        <Badge label={capitalize(offer.urgency_level ?? 'standard')} backgroundColor={urgency.bg} color={urgency.color} />
      </View>

      <View className="flex-row items-center mb-1">
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
          {offer.pickup_area ?? 'Area unavailable'}
        </Text>
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

      {offer.description || offer.fabric_notes || offer.customization_notes || offer.cloth_details ? (
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
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              Cloth: {offer.cloth_details}
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
            <Text className="text-sm font-semibold text-white">
              {accepting ? 'Accepting…' : 'Accept'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default function BroadcastsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const location = useLocation();
  const setOnlineStatus = useSetTailorOnlineStatusMutation();
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useBroadcastOffers(
    { limit: 50 },
    isOnline,
  );
  const acceptMutation = useAcceptBroadcastMutation();
  const declineMutation = useDeclineBroadcastMutation();
  const [declineTarget, setDeclineTarget] = useState<BroadcastOffer | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const offers = data?.broadcasts ?? [];

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
      } else {
        await setOnlineStatus.mutateAsync({ is_online: false });
        location.stop();
        setIsOnline(false);
      }
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
              <OfferCard
                offer={item}
                onAccept={() => handleAccept(item)}
                onDeclinePress={() => setDeclineTarget(item)}
                accepting={acceptMutation.isPending && actingOrderId === item.order_id}
                declining={declineMutation.isPending && actingOrderId === item.order_id}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
