import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TailorOfferCard } from '@/features/broadcasts/components/TailorOfferCard';
import {
  useAcceptBroadcastMutation,
  useBroadcastOffers,
  useDeclineBroadcastMutation,
} from '@/features/broadcasts/hooks/useBroadcasts';
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

  const acceptMutation = useAcceptBroadcastMutation();
  const declineMutation = useDeclineBroadcastMutation();

  useOfferAlertSound(visible);

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

  const acting = acceptMutation.isPending || declineMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="items-center pt-6 pb-2">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="shirt-outline" size={30} color={colors.primary} />
          </View>
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            New Order Offer!
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {pending.orderCode ?? `Order #${pending.orderId}`}
          </Text>
        </View>

        <ScrollView className="flex-1 px-5 mt-2" showsVerticalScrollIndicator={false}>
          {!offer ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="small" color={colors.primary} />
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

        <View
          className="px-5 pt-1"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {acting ? (
            <View className="items-center py-2">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
