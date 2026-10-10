import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import {
  LocationRow,
  hasExpired,
  itemsLabel,
  useCountdown,
  useCountdownProgress,
} from '@/features/broadcasts/offerCardHelpers';
import {
  useAcceptDeliveryBroadcastMutation,
  useDeclineDeliveryBroadcastMutation,
  useDeliveryBroadcastOffers,
} from '@/features/deliveries/hooks/useDeliveries';
import {
  useAcceptPickupBroadcastMutation,
  useDeclinePickupBroadcastMutation,
  usePickupBroadcastOffers,
} from '@/features/pickups/hooks/usePickups';
import {
  useAcceptReturnBroadcastMutation,
  useDeclineReturnBroadcastMutation,
  useReturnBroadcastOffers,
} from '@/features/returns/hooks/useReturns';
import {
  useAcceptRepairPickupBroadcastMutation,
  useDeclineRepairPickupBroadcastMutation,
  useRepairPickupBroadcastOffers,
} from '@/features/repairPickups/hooks/useRepairPickups';
import {
  useAcceptRepairDeliveryBroadcastMutation,
  useDeclineRepairDeliveryBroadcastMutation,
  useRepairDeliveryBroadcastOffers,
} from '@/features/repairDeliveries/hooks/useRepairDeliveries';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useOfferAlertSound } from '@/hooks/useOfferAlertSound';
import { useIncomingOfferStore, type IncomingOfferLocation } from '@/store/incomingOfferStore';
import { formatCurrency } from '@/utils/errors';

// Full-screen, non-dismissible "New offer!" takeover - the Rapido/Ola-style
// ride-request popup this app was missing. Previously a new pickup/delivery/
// return broadcast only surfaced as a toast + looping sound
// (OfferAlerts.tsx), leaving the employee to notice, then manually navigate
// to the right list screen to find and accept it. This shows pickup/drop/
// distance/items with Accept/Reject right on the popup, closing the loop
// with zero navigation. Modeled on SessionExpired.tsx's non-dismissible
// pattern (plain RN Modal, no onRequestClose, no backdrop-tap-to-close) -
// an incoming job offer isn't something to accidentally swipe away.
export const IncomingOfferModal = () => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const { permissions } = usePermissions();
  const staffEnabled = !!permissions.deliveries;

  const queue = useIncomingOfferStore((s) => s.queue);
  const removeOffer = useIncomingOfferStore((s) => s.remove);
  const offer = queue[0] ?? null;

  // Pickup offers arrive with no location payload at all (see
  // incomingOfferStore.ts's IncomingOffer docstring) - resolve it from the
  // list endpoint the WS event already invalidated, so it's typically ready
  // within a moment of the popup opening. Delivery/return already have
  // full location data from the WS payload, but their list rows also carry
  // the real expires_at/broadcast_round (the WS payload doesn't - see
  // useAppSocket.ts's approxExpiresAt comment), so look those up too purely
  // to correct the countdown/round display once available.
  const needsPickupLookup = offer?.kind === 'pickup' && !offer.pickup;
  const pickupQuery = usePickupBroadcastOffers(staffEnabled && offer?.kind === 'pickup');
  const deliveryQuery = useDeliveryBroadcastOffers(staffEnabled && offer?.kind === 'delivery');
  const returnQuery = useReturnBroadcastOffers(staffEnabled && offer?.kind === 'return');
  const repairPickupQuery = useRepairPickupBroadcastOffers(staffEnabled && offer?.kind === 'repair_pickup');
  const repairDeliveryQuery = useRepairDeliveryBroadcastOffers(staffEnabled && offer?.kind === 'repair_delivery');
  const pickupOffersData = pickupQuery.data;
  const deliveryOffersData = deliveryQuery.data;
  const returnOffersData = returnQuery.data;
  const repairPickupOffersData = repairPickupQuery.data;
  const repairDeliveryOffersData = repairDeliveryQuery.data;

  // order_id comes back as a number from these list endpoints
  // (employee.py: "order_id": order.Id) while offer.orderId is always a
  // string (useAppSocket.ts's String(data.order_id ?? '')) - String()-ing
  // both sides here so this actually matches instead of always missing.
  const resolvedPickupOffer = pickupOffersData?.broadcasts.find((b) => String(b.order_id) === String(offer?.orderId));
  const resolvedDeliveryOffer = deliveryOffersData?.broadcasts.find((b) => String(b.order_id) === String(offer?.orderId));
  const resolvedReturnOffer = returnOffersData?.broadcasts.find((b) => String(b.order_id) === String(offer?.orderId));
  const resolvedRepairPickupOffer = repairPickupOffersData?.broadcasts.find(
    (b) => String(b.order_id) === String(offer?.orderId),
  );
  const resolvedRepairDeliveryOffer = repairDeliveryOffersData?.broadcasts.find(
    (b) => String(b.order_id) === String(offer?.orderId),
  );
  const resolvedOffer =
    resolvedPickupOffer ??
    resolvedDeliveryOffer ??
    resolvedReturnOffer ??
    resolvedRepairPickupOffer ??
    resolvedRepairDeliveryOffer;

  // Prefer the resolved list-endpoint data (which carries the real
  // server-computed distance_km, see _leg_distance_km in employee.py) over
  // the raw WS payload for BOTH legs and every offer kind - the WS
  // notification's own pickup/drop dicts (built separately in each
  // broadcast service) never carry distance_km, only the list endpoints
  // this hook queries do. Previously only the plain "pickup" kind ever
  // looked at resolvedOffer for its pickup leg, and drop never did at all
  // for any kind - meaning every delivery/return/repair offer's distance
  // silently stayed null even once the backend started sending it.
  const pickup: IncomingOfferLocation | null | undefined = resolvedOffer?.pickup ?? offer?.pickup ?? null;
  const resolvedDrop: IncomingOfferLocation | null | undefined =
    resolvedOffer && 'drop' in resolvedOffer ? resolvedOffer.drop : null;
  const drop: IncomingOfferLocation | null | undefined = resolvedDrop ?? offer?.drop ?? null;
  const items = resolvedOffer?.items;
  const expiresAt = resolvedOffer?.expires_at ?? offer?.expiresAt;
  const notifiedAt = resolvedOffer?.notified_at;
  const broadcastRound = resolvedOffer?.broadcast_round ?? offer?.broadcastRound;
  // Only on the resolved list-endpoint data - the raw WS payload never
  // carries it (same reasoning as expiresAt/broadcastRound above).
  const rateAmount = resolvedOffer?.rate_amount;

  const acceptPickup = useAcceptPickupBroadcastMutation();
  const declinePickup = useDeclinePickupBroadcastMutation();
  const acceptDelivery = useAcceptDeliveryBroadcastMutation();
  const declineDelivery = useDeclineDeliveryBroadcastMutation();
  const acceptReturn = useAcceptReturnBroadcastMutation();
  const declineReturn = useDeclineReturnBroadcastMutation();
  const acceptRepairPickup = useAcceptRepairPickupBroadcastMutation();
  const declineRepairPickup = useDeclineRepairPickupBroadcastMutation();
  const acceptRepairDelivery = useAcceptRepairDeliveryBroadcastMutation();
  const declineRepairDelivery = useDeclineRepairDeliveryBroadcastMutation();

  // Selected on every render (NOT memoised): memoising froze the mutation
  // results at their first-render values, so `isPending` stayed false and a
  // double-tap on Accept sent two requests.
  const mutationPair = {
    delivery: [acceptDelivery, declineDelivery],
    return: [acceptReturn, declineReturn],
    repair_pickup: [acceptRepairPickup, declineRepairPickup],
    repair_delivery: [acceptRepairDelivery, declineRepairDelivery],
    pickup: [acceptPickup, declinePickup],
  }[offer?.kind ?? 'pickup'];
  const [acceptMutation, declineMutation] = mutationPair;

  const countdown = useCountdown(expiresAt);
  const isExpired = hasExpired(expiresAt);
  const countdownProgress = useCountdownProgress(notifiedAt, expiresAt);

  // The broadcast already timed out server-side by the time the countdown
  // hits zero - nothing to decline, just stop showing it and move to
  // whatever's next in the queue.
  useEffect(() => {
    if (offer && isExpired) removeOffer(offer.kind, offer.orderId);
  }, [offer, isExpired, removeOffer]);

  // The offer can be gone before its timer runs out (another employee accepted,
  // the round rotated). Once a list fetched AFTER this offer appeared no longer
  // contains it, drop it instead of showing a dead offer.
  const activeQuery =
    offer?.kind === 'delivery'
      ? deliveryQuery
      : offer?.kind === 'return'
        ? returnQuery
        : offer?.kind === 'repair_pickup'
          ? repairPickupQuery
          : offer?.kind === 'repair_delivery'
            ? repairDeliveryQuery
            : pickupQuery;
  const shownAt = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const offerIdentity = offer ? `${offer.kind}:${offer.orderId}` : '';
  if (offerIdentity && shownAt.current.key !== offerIdentity) {
    shownAt.current = { key: offerIdentity, at: Date.now() };
  }
  const listConfirmsGone =
    !!offer &&
    !resolvedOffer &&
    !activeQuery.isFetching &&
    activeQuery.isSuccess &&
    activeQuery.dataUpdatedAt >= shownAt.current.at;
  useEffect(() => {
    if (offer && listConfirmsGone) removeOffer(offer.kind, offer.orderId);
  }, [offer, listConfirmsGone, removeOffer]);

  const visible = !!offer && staffEnabled;
  useOfferAlertSound(visible && !isExpired);

  // Physical cue the moment an offer lands (the looping sound alone is easy to
  // miss in a pocket or a noisy street). Once per offer, not per re-render.
  const offerKey = offer ? `${offer.kind}:${offer.orderId}` : null;
  useEffect(() => {
    if (!offerKey || !staffEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [offerKey, staffEnabled]);

  if (!offer) return null;

  // Real server-computed per-leg distance (employee.py's distance_km) -
  // replaces the old client-side haversine-from-live-GPS approximation,
  // which only ever covered the pickup leg and silently showed nothing if
  // the device's own GPS read was stale/denied.
  const pickupDistanceKm = pickup?.distance_km ?? null;
  const dropDistanceKm = drop?.distance_km ?? null;

  const pickupLine = pickup
    ? [pickup.address_line_1, pickup.address_line_2, pickup.city, pickup.pincode].filter(Boolean).join(', ') ||
      pickup.location ||
      null
    : null;
  const dropLine = drop
    ? [drop.address_line_1, drop.address_line_2, drop.city, drop.pincode].filter(Boolean).join(', ')
    : null;

  const titleKey =
    offer.kind === 'delivery'
      ? 'deliveries.deliveryOrder'
      : offer.kind === 'return'
        ? 'returns.returnOrder'
        : offer.kind === 'repair_pickup'
          ? 'repairPickups.repairPickupOrder'
          : offer.kind === 'repair_delivery'
            ? 'repairDeliveries.repairDeliveryOrder'
            : 'pickups.pickupOrder';
  const iconName =
    offer.kind === 'delivery' || offer.kind === 'repair_delivery'
      ? 'bicycle-outline'
      : offer.kind === 'return'
        ? 'return-up-back-outline'
        : offer.kind === 'repair_pickup'
          ? 'construct-outline'
          : 'cube-outline';

  const handleAccept = () => {
    if (acceptMutation.isPending || declineMutation.isPending) return;
    acceptMutation.mutate(offer.orderId, {
      onSuccess: () => {
        removeOffer(offer.kind, offer.orderId);
        router.push(`/(drawer)/orders/${offer.orderId}` as never);
      },
      // The mutation already toasted why (usually "no longer available").
      onError: () => removeOffer(offer.kind, offer.orderId),
    });
  };

  const handleDecline = () => {
    if (acceptMutation.isPending || declineMutation.isPending) return;
    declineMutation.mutate(offer.orderId, { onSettled: () => removeOffer(offer.kind, offer.orderId) });
  };

  const acting = acceptMutation.isPending || declineMutation.isPending;
  const loadingPickupDetails = needsPickupLookup && !resolvedPickupOffer;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="items-center pt-6 pb-2">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name={iconName} size={30} color={colors.primary} />
          </View>
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {t(titleKey)}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {offer.orderCode ?? t('pickups.orderHash', { id: offer.orderId })}
          </Text>
          <View className="flex-row items-center mt-3" style={{ gap: 10 }}>
            <View
              className="px-4 py-1.5 rounded-full"
              style={{ backgroundColor: isExpired ? `${colors.error}20` : `${colors.primary}20` }}
            >
              <Text
                className="text-lg font-black"
                style={{ color: isExpired || countdownProgress < 0.1 ? colors.error : colors.primary }}
                accessibilityRole="timer"
                accessibilityLiveRegion="none"
              >
                {countdown}
              </Text>
            </View>
            {rateAmount != null ? (
              <View
                className="px-4 py-1.5 rounded-full flex-row items-center"
                style={{ backgroundColor: `${colors.success}20`, gap: 6 }}
                accessibilityLabel={`${t('pickups.youEarn')} ${formatCurrency(rateAmount)}`}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                  {t('pickups.youEarn')}
                </Text>
                <Text className="text-lg font-black" style={{ color: colors.success }}>
                  {formatCurrency(rateAmount)}
                </Text>
              </View>
            ) : null}
          </View>
          {expiresAt ? (
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
          ) : null}
          {queue.length > 1 ? (
            <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
              {t('pickups.moreOffersWaiting', { count: queue.length - 1 })}
            </Text>
          ) : null}
        </View>

        <ScrollView className="flex-1 px-5 mt-2" showsVerticalScrollIndicator={false}>
          {loadingPickupDetails ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View
              className="rounded-2xl p-4 border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <LocationRow
                icon={
                  offer.kind === 'delivery' || offer.kind === 'return' || offer.kind === 'repair_delivery'
                    ? 'cut-outline'
                    : 'location-outline'
                }
                iconColor={colors.primary}
                label={
                  offer.kind === 'delivery' || offer.kind === 'return' || offer.kind === 'repair_delivery'
                    ? t('deliveries.pickupTailor')
                    : t('pickups.pickupCustomer')
                }
                addressLine={pickupLine || t('pickups.addressNotAvailable')}
                personName={pickup?.tailor_name ?? pickup?.full_name}
                mobile={pickup?.tailor_mobile ?? pickup?.mobile}
                distanceKm={pickupDistanceKm}
                onPress={undefined}
                colors={colors}
              />
              {drop ? (
                <>
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
                  <LocationRow
                    icon="location-outline"
                    iconColor={colors.error}
                    label={t('deliveries.dropCustomer')}
                    addressLine={dropLine || t('pickups.addressNotAvailable')}
                    personName={drop.full_name}
                    mobile={drop.mobile}
                    distanceKm={dropDistanceKm}
                    onPress={undefined}
                    colors={colors}
                  />
                </>
              ) : null}
            </View>
          )}

          {itemsLabel(items) ? (
            <View className="flex-row items-start mt-4">
              <Ionicons name="shirt-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="text-sm ml-2 flex-1" style={{ color: colors.textSecondary }}>
                {itemsLabel(items)}
              </Text>
            </View>
          ) : null}

          {broadcastRound ? (
            <Text className="text-xs mt-3" style={{ color: colors.textMuted }}>
              {t('broadcastMonitor.round', { round: broadcastRound })}
            </Text>
          ) : null}
        </ScrollView>

        <View
          className="px-5 pt-3 flex-row"
          style={{ gap: 12, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderColor: colors.border }}
        >
          <Button
            title={t('pickups.decline')}
            variant="outline"
            size="lg"
            onPress={handleDecline}
            loading={declineMutation.isPending}
            disabled={acting || isExpired}
            className="flex-1"
          />
          <Button
            title={t('pickups.accept')}
            variant="primary"
            size="lg"
            onPress={handleAccept}
            loading={acceptMutation.isPending}
            disabled={acting || isExpired}
            className="flex-1"
          />
        </View>
      </View>
    </Modal>
  );
};
