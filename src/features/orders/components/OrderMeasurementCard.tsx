import { Text } from 'react-native';
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

  if (!order.measurement) {
    if (!isTailorRole) return null;
    return (
      <Card className="mb-4">
        <Text className="font-bold mb-1" style={{ color: colors.text }}>
          Measurements
        </Text>
        <Text className="text-sm" style={{ color: colors.textMuted }}>
          Not collected yet — the assigned Bridge employee records these at pickup.
        </Text>
      </Card>
    );
  }

  const m = order.measurement;
  return (
    <Card className="mb-4">
      <Text className="font-bold mb-2" style={{ color: colors.text }}>
        Measurements
      </Text>
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
