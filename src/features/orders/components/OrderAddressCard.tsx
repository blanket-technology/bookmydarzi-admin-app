import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import apiClient from '@/config/axios';
import { openMap } from '@/features/broadcasts/offerCardHelpers';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { DetailRow } from './DetailRow';

interface ServiceabilityResult {
  serviceable: boolean;
  distance_km?: number | null;
}

/** Delivery address card - this screen previously showed no address at all
 * (normalizeOrderResponse discarded everything but full_name/mobile). Also
 * surfaces a serviceability/distance badge, mirroring the web admin panel's
 * equivalent (OrderFullDetailsPage.jsx's ServiceabilityBadge): calls the
 * same existing public GET /location/check-serviceability endpoint client
 * side using the address's own lat/lng, rather than trusting a stale flag.
 * This is a staff-visibility signal only - the real gate already runs
 * server-side at order placement (assert_serviceable_for_address). */
export const OrderAddressCard = ({ order }: { order: AdminOrderItem }) => {
  const { colors } = useTheme();
  const address = order.address;
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);

  useEffect(() => {
    const lat = address?.latitude;
    const lng = address?.longitude;
    if (lat == null || lng == null) {
      setServiceability(null);
      return;
    }
    let cancelled = false;
    apiClient
      .get<ServiceabilityResult>(`/api/v1/location/check-serviceability?latitude=${lat}&longitude=${lng}`)
      .then((res) => {
        if (!cancelled) setServiceability(res.data);
      })
      .catch(() => {
        if (!cancelled) setServiceability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address?.latitude, address?.longitude]);

  if (!address) {
    return (
      <Card className="mb-4">
        <Text className="font-bold mb-2" style={{ color: colors.text }}>
          Delivery Address
        </Text>
        <Text className="text-sm py-1" style={{ color: colors.textMuted }}>
          No delivery address on file.
        </Text>
      </Card>
    );
  }

  const cityStatePin = [address.city, address.state, address.pincode].filter(Boolean).join(', ');

  return (
    <Card className="mb-4">
      <Text className="font-bold mb-2" style={{ color: colors.text }}>
        Delivery Address
      </Text>
      {address.full_name ? <DetailRow label="Name" value={address.full_name} colors={colors} /> : null}
      {address.mobile ? <DetailRow label="Mobile" value={address.mobile} colors={colors} /> : null}
      {address.address_line_1 ? (
        <DetailRow
          label="Address"
          value={[address.address_line_1, address.address_line_2, address.landmark ? `Near ${address.landmark}` : null]
            .filter(Boolean)
            .join(', ')}
          colors={colors}
        />
      ) : null}
      {cityStatePin ? <DetailRow label="City/State" value={cityStatePin} colors={colors} /> : null}

      {/* Bug fix: a Bridge partner on the way to pick up or deliver had no
          way to actually navigate there from this screen - the address text
          was shown, but tapping it did nothing. Reuses openMap, already
          proven on the pre-accept broadcast offer cards. */}
      {address.latitude != null && address.longitude != null ? (
        <Pressable
          onPress={() => openMap(address.latitude, address.longitude, address.address_line_1 ?? undefined)}
          className="flex-row items-center self-start mt-2 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <Ionicons name="navigate-outline" size={14} color={colors.primary} />
          <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
            Get Directions
          </Text>
        </Pressable>
      ) : null}

      {serviceability && serviceability.distance_km != null ? (
        serviceability.serviceable ? (
          <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
            {serviceability.distance_km} km from nearest hub
          </Text>
        ) : (
          <View
            className="flex-row items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg border"
            style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
          >
            <Ionicons name="warning-outline" size={14} color="#92400e" />
            <Text className="text-xs font-semibold flex-1" style={{ color: '#92400e' }}>
              {serviceability.distance_km} km from nearest hub — outside the configured service area
            </Text>
          </View>
        )
      ) : null}
    </Card>
  );
};
