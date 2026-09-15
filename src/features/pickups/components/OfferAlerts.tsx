import { useEffect, useRef } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useBroadcastOffers } from '@/features/broadcasts/hooks/useBroadcasts';
import { useDeliveryBroadcastOffers } from '@/features/deliveries/hooks/useDeliveries';
import { usePickupBroadcastOffers } from '@/features/pickups/hooks/usePickups';
import { toast } from '@/store/toastStore';

/**
 * App-wide alert for incoming job offers - tailor broadcasts (accept/decline
 * a new order) and Bridge/employee pickup + delivery broadcasts. Reacts to
 * these offer queries changing - invalidated instantly by useAppSocket.ts on
 * the matching NOTIFICATION event, not just the poll fallback - and raises a
 * one-shot toast per role on every fresh increase.
 *
 * Bridge/employee (pickup/delivery) offers open IncomingOfferModal, and
 * tailor broadcasts open IncomingBroadcastModal (both in AppProviders.tsx) -
 * each owns its own looping sound/haptics tied to actually being on screen,
 * so this component is toast-only now; it never plays the alert sound
 * itself.
 *
 * Each role only runs the query for its own offer type (gated on
 * permissions.broadcasts for tailors, permissions.deliveries for Bridge/
 * employee), so no other role polls or alerts for offers that aren't theirs.
 * Mounted once inside AppProviders.
 */
export const OfferAlerts = () => {
  const { permissions } = usePermissions();
  const tailorEnabled = !!permissions.broadcasts;
  const staffEnabled = !!permissions.deliveries;

  const { data: tailorData } = useBroadcastOffers(undefined, tailorEnabled);
  const { data: pickupData } = usePickupBroadcastOffers(staffEnabled);
  const { data: deliveryData } = useDeliveryBroadcastOffers(staffEnabled);

  const tailorCount = tailorData?.total ?? 0;
  const pickupCount = pickupData?.total ?? 0;
  const deliveryCount = deliveryData?.total ?? 0;

  const prevTailor = useRef<number | null>(null);
  const prevPickup = useRef<number | null>(null);
  const prevDelivery = useRef<number | null>(null);

  // Fires a toast the moment any one count freshly increases (skips the
  // first observation per query - initial load isn't a "new" offer).
  useEffect(() => {
    if (prevTailor.current !== null && tailorCount > prevTailor.current) {
      toast.info('New order offer nearby — tap Broadcasts to accept');
    }
    prevTailor.current = tailorCount;
  }, [tailorCount]);

  useEffect(() => {
    if (prevPickup.current !== null && pickupCount > prevPickup.current) {
      toast.info('New pickup offer nearby — tap Pickups to accept');
    }
    prevPickup.current = pickupCount;
  }, [pickupCount]);

  useEffect(() => {
    if (prevDelivery.current !== null && deliveryCount > prevDelivery.current) {
      toast.info('New delivery offer nearby — tap Deliveries to accept');
    }
    prevDelivery.current = deliveryCount;
  }, [deliveryCount]);

  // Reset baselines when a role loses access (e.g. logout) so a later login
  // doesn't false-fire off a stale count.
  useEffect(() => {
    if (!tailorEnabled) prevTailor.current = null;
    if (!staffEnabled) {
      prevPickup.current = null;
      prevDelivery.current = null;
    }
  }, [tailorEnabled, staffEnabled]);

  return null;
};
