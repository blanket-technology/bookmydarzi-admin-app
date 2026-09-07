import { useEffect, useRef, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useOfferAlertSound } from '@/hooks/useOfferAlertSound';
import { useBroadcastOffers } from '@/features/broadcasts/hooks/useBroadcasts';
import { useDeliveryBroadcastOffers } from '@/features/deliveries/hooks/useDeliveries';
import { usePickupBroadcastOffers } from '@/features/pickups/hooks/usePickups';
import { toast } from '@/store/toastStore';

/**
 * App-wide alert for incoming job offers - tailor broadcasts (accept/decline
 * a new order) and Bridge/employee pickup + delivery broadcasts. Reacts to
 * these offer queries changing - invalidated instantly by useAppSocket.ts on
 * the matching NOTIFICATION event, not just the poll fallback - and raises
 * BOTH a toast and a continuous, Uber/Ola/Rapido-style alert (looping sound +
 * repeated haptic pulse, see useOfferAlertSound) that keeps going for as
 * long as ANY tracked offer count is still above zero - not a single
 * easy-to-miss ding. The alert silences itself the instant every count the
 * staff member is watching drops back to zero (accepted/declined/expired).
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

  // The continuous alert (looping sound + repeated haptic pulse) tracks
  // straightforwardly off current totals - it's active for as long as ANY
  // enabled offer type has a pending count, and stops the instant they're
  // all back to zero. No separate "was this a fresh increase" gate is
  // needed here (that's only relevant for the one-shot toasts above),
  // since re-alerting while an offer is still genuinely pending is exactly
  // the "keep ringing until acted on" behavior this is meant to have.
  const alerting = (tailorEnabled && tailorCount > 0) || (staffEnabled && (pickupCount > 0 || deliveryCount > 0));
  useOfferAlertSound(alerting);

  return null;
};
