import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCountdown, useCountdownProgress } from '@/features/broadcasts/offerCardHelpers';
import { TailorOfferCard } from '@/features/broadcasts/components/TailorOfferCard';
import {
  useAcceptBroadcastMutation,
  useBroadcastOffers,
  useDeclineBroadcastMutation,
} from '@/features/broadcasts/hooks/useBroadcasts';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { useOfferAlertSound } from '@/hooks/useOfferAlertSound';
import { useIncomingBroadcastStore } from '@/store/incomingBroadcastStore';

// Tailor-role sibling of IncomingOfferModal.tsx (Bridge/employee). A tailor
// broadcast's WS notification carries almost nothing (order_id/order_code
// only - see broadcast_service.py's _notify_tailors), so this always
// resolves the real card from GET /orders/broadcasts (already invalidated
// by useAppSocket.ts's handleNotification) rather than the WS payload
// itself - same pattern IncomingOfferModal.tsx uses for pickup offers.
export const IncomingBroadcastModal = () => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const { permissions } = usePermissions();
  const tailorEnabled = !!permissions.broadcasts;

  const queue = useIncomingBroadcastStore((s) => s.queue);
  const dequeue = useIncomingBroadcastStore((s) => s.dequeue);
  const pending = queue[0] ?? null;

  const visible = !!pending && tailorEnabled;

  // Enabled independent of the tailor's online/offline toggle on the
  // Broadcasts screen - if a WS event enqueued this, the offer already
  // exists server-side regardless of what the toggle shows right now.
  const { data } = useBroadcastOffers({ limit: 50 }, visible);
  // order_id comes back as a number from GET /orders/broadcasts
  // (broadcast.py: "order_id": int(order.Id)) while pending.orderId is
  // always a string (see useAppSocket.ts's String(data.order_id ?? '')) -
  // without String()-ing both sides this strict-equality find() never
  // matches, so the modal never leaves its loading state.
  const offer = data?.broadcasts.find((b) => String(b.order_id) === String(pending?.orderId));

  // Bug fix: this modal previously showed no expiry countdown at all,
  // despite the exact same 5-minute broadcast-round mechanics applying
  // server-side as the Bridge/employee side's IncomingOfferModal (which
  // already has one) - a tailor had no urgency signal and could sit on an
  // offer that had already timed out and moved to the next round/tailor.
  const countdown = useCountdown(offer?.expires_at);
  const isExpired = countdown === t('pickups.expired');
  const countdownProgress = useCountdownProgress(offer?.notified_at, offer?.expires_at);

  const acceptMutation = useAcceptBroadcastMutation();
  const declineMutation = useDeclineBroadcastMutation();

  // Mirrors IncomingOfferModal.tsx's identical effect - the broadcast
  // already timed out server-side by the time the countdown hits zero,
  // nothing left to accept/decline, just clear it and move on.
  useEffect(() => {
    if (pending && offer && isExpired) dequeue();
  }, [pending, offer, isExpired, dequeue]);

  useOfferAlertSound(visible && !isExpired);

  if (!pending) return null;

  const handleAccept = () => {
    acceptMutation.mutate(pending.orderId, {
      onSuccess: () => {
        dequeue();
        router.push(`/(drawer)/orders/${pending.orderId}` as never);
      },
      onError: () => dequeue(),
    });
  };

  const handleDecline = () => {
    declineMutation.mutate(pending.orderId, { onSettled: () => dequeue() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="items-center pt-6 pb-2 px-5">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="shirt-outline" size={30} color={colors.primary} />
          </View>
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {t('incomingBroadcast.title')}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {offer?.order_code ?? pending.orderCode ?? `Order #${pending.orderId}`}
          </Text>
          {offer?.expires_at ? (
            <>
              <View
                className="mt-3 px-4 py-1.5 rounded-full"
                style={{ backgroundColor: isExpired ? `${colors.error}20` : `${colors.primary}20` }}
              >
                <Text className="text-lg font-black" style={{ color: isExpired ? colors.error : colors.primary }}>
                  {countdown}
                </Text>
              </View>
              <View
                className="h-1.5 rounded-full mt-3"
                style={{ width: '70%', maxWidth: 260, backgroundColor: colors.border, overflow: 'hidden' }}
              >
                <View
                  style={{
                    width: `${countdownProgress * 100}%`,
                    height: '100%',
                    backgroundColor: isExpired
                      ? colors.error
                      : countdownProgress < 0.3
                        ? '#f59e0b'
                        : colors.primary,
                  }}
                />
              </View>
            </>
          ) : null}
          {offer?.broadcast_round ? (
            <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
              {t('broadcastMonitor.round', { round: offer.broadcast_round })}
            </Text>
          ) : null}
          {queue.length > 1 ? (
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {t('pickups.moreOffersWaiting', { count: queue.length - 1 })}
            </Text>
          ) : null}
        </View>

        <ScrollView
          className="flex-1 px-5 mt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: !offer ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
        >
          {!offer ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm mt-3" style={{ color: colors.textMuted }}>
                Loading order details…
              </Text>
            </View>
          ) : (
            <TailorOfferCard
              offer={offer}
              onAccept={handleAccept}
              onDeclinePress={handleDecline}
              accepting={acceptMutation.isPending}
              declining={declineMutation.isPending}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};
