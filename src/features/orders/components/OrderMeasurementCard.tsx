import { Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { capitalize } from '@/utils/errors';
import { DetailRow } from './DetailRow';

/** Single-item measurement snapshot card. Shows the recorded values once
 * present; for a tailor with nothing recorded yet, shows the "Bridge
 * collects this at pickup" explainer instead. Extracted unchanged from
 * orders/[id].tsx. Only rendered by the parent for single-item orders -
 * multi-item orders use OrderItemsCard's per-item fill/update flow instead. */
export const OrderMeasurementCard = ({
  order,
  isTailorRole,
}: {
  order: AdminOrderItem;
  isTailorRole: boolean;
}) => {
  const { colors } = useTheme();
  // Single-item orders don't render OrderItemsCard (see that component's
  // own docstring), so this is the only card that gets a chance to show
  // what add-ons were selected - without it the tailor/bridge had no way
  // to see "+ Button Replacement" etc. on a one-item order at all.
  const addons = order.items?.[0]?.addons;

  const addonsBlock =
    addons && addons.length > 0 ? (
      <View className="mb-4">
        {addons.map((addon, idx) => (
          <Text key={addon.addon_id ?? idx} className="text-xs" style={{ color: colors.primary }}>
            + {addon.name}
            {addon.note ? ` (${addon.note})` : ''}
          </Text>
        ))}
      </View>
    ) : null;

  if (!order.measurement) {
    // Previously returned null outright for non-tailor roles when no
    // measurement existed yet, which also hid any selected add-ons from
    // Admin/Superadmin/Employee - add-ons are relevant to everyone, not
    // just the "measurement not collected" explainer, so render the card
    // whenever there's an addons block even if measurements aren't ready.
    if (!isTailorRole && !addonsBlock) return null;
    return (
      <Card className="mb-4">
        <Text className="font-bold mb-1" style={{ color: colors.text }}>
          Measurements
        </Text>
        {isTailorRole ? (
          <Text className="text-sm mb-2" style={{ color: colors.textMuted }}>
            Not collected yet — the assigned Bridge employee records these at pickup.
          </Text>
        ) : null}
        {addonsBlock}
      </Card>
    );
  }

  const m = order.measurement;
  return (
    <Card className="mb-4">
      <Text className="font-bold mb-2" style={{ color: colors.text }}>
        Measurements
      </Text>
      {addonsBlock}
      <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {m.profile_name}
      </Text>
      {m.chest != null ? <DetailRow label="Chest" value={`${m.chest} in`} colors={colors} /> : null}
      {m.waist != null ? <DetailRow label="Waist" value={`${m.waist} in`} colors={colors} /> : null}
      {m.hips != null ? <DetailRow label="Hips" value={`${m.hips} in`} colors={colors} /> : null}
      {m.shoulder != null ? <DetailRow label="Shoulder" value={`${m.shoulder} in`} colors={colors} /> : null}
      {m.neck != null ? <DetailRow label="Neck" value={`${m.neck} in`} colors={colors} /> : null}
      {m.sleeve_length != null ? <DetailRow label="Sleeve Length" value={`${m.sleeve_length} in`} colors={colors} /> : null}
      {m.inseam != null ? <DetailRow label="Inseam" value={`${m.inseam} in`} colors={colors} /> : null}
      {m.height != null ? <DetailRow label="Height" value={`${m.height} in`} colors={colors} /> : null}
      {m.fit_preference ? <DetailRow label="Fit Preference" value={capitalize(m.fit_preference)} colors={colors} /> : null}
      {m.notes ? <DetailRow label="Notes" value={m.notes} colors={colors} /> : null}
    </Card>
  );
};
