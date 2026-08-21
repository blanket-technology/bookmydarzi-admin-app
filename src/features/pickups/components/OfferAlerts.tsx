import { useEffect, useRef } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useDeliveryBroadcastOffers } from '@/features/deliveries/hooks/useDeliveries';
import { usePickupBroadcastOffers } from '@/features/pickups/hooks/usePickups';
import { toast } from '@/store/toastStore';

/**
 * App-wide alert for incoming pickup / delivery broadcast offers. Reacts to
 * these offer queries changing - now invalidated instantly by useAppSocket.ts
 * on the matching NOTIFICATION event (pickup_broadcast_offer /
 * delivery_broadcast_offer), not just the 90s poll fallback - and fires a
 * toast the moment a new offer appears. The Pickups / Deliveries screens and
 * the drawer badges are driven by the same queries, so everything updates
 * together.
 *
 * Gated on the `deliveries` permission (the Bridge/employee role), so no
 * other role runs these polls. Mounted once inside AppProviders.
 */
export const OfferAlerts = () => {
  const { permissions } = usePermissions();
  const enabled = !!permissions.deliveries;

  const { data: pickupData } = usePickupBroadcastOffers(enabled);
  const { data: deliveryData } = useDeliveryBroadcastOffers(enabled);

  const prevPickup = useRef<number | null>(null);
  const prevDelivery = useRef<number | null>(null);

  useEffect(() => {
    const count = pickupData?.total ?? 0;
    // Skip the first observation (initial load isn't a "new" offer).
    if (prevPickup.current !== null && count > prevPickup.current) {
      toast.info('📦 New pickup offer nearby — tap Pickups to accept');
    }
    prevPickup.current = count;
  }, [pickupData?.total]);

  useEffect(() => {
    const count = deliveryData?.total ?? 0;
    if (prevDelivery.current !== null && count > prevDelivery.current) {
      toast.info('🚚 New delivery offer nearby — tap Deliveries to accept');
    }
    prevDelivery.current = count;
  }, [deliveryData?.total]);

  // Reset baselines when the role loses access (e.g. logout) so a later login
  // doesn't false-fire off a stale count.
  useEffect(() => {
    if (!enabled) {
      prevPickup.current = null;
      prevDelivery.current = null;
    }
  }, [enabled]);

  return null;
};
