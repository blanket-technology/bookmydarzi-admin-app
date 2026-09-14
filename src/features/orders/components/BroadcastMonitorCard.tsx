import { ActivityIndicator, Text, View } from 'react-native';
import { Badge, Card } from '@/components/ui';
import { ORDER_STATUS_COLORS } from '@/constants/orderStatus';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { OrderBroadcastStatus } from '@/types/orders';
import { formatDate } from '@/utils/errors';

/** Admin-only tailor-broadcast round tracker - only meaningful while an
 * order is actively searching for/being offered to a tailor. Extracted
 * unchanged from orders/[id].tsx. */
export const BroadcastMonitorCard = ({
  status,
  isLoading,
}: {
  status: OrderBroadcastStatus | undefined;
  isLoading: boolean;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-bold" style={{ color: colors.text }}>
          {t('broadcastMonitor.title')}
        </Text>
        {isLoading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
      </View>
      {status && status.broadcasts.length > 0 ? (
        status.broadcasts.map((b, idx) => (
          <View
            key={b.id}
            className="flex-row items-center justify-between py-2.5"
            style={idx < status.broadcasts.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : undefined}
          >
            <View>
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('broadcastMonitor.tailorHash', { id: b.tailor_id })} · {b.round >= 4 ? t('broadcastMonitor.round4') : t('broadcastMonitor.round', { round: b.round })}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {t('broadcastMonitor.notified', { date: formatDate(b.notified_at ?? undefined) })}
                {b.responded_at ? ` · ${t('broadcastMonitor.responded', { date: formatDate(b.responded_at) })}` : ''}
              </Text>
            </View>
            <Badge
              label={b.status}
              backgroundColor={`${ORDER_STATUS_COLORS[b.status] ?? colors.primary}20`}
              color={ORDER_STATUS_COLORS[b.status] ?? colors.primary}
            />
          </View>
        ))
      ) : (
        <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
          {t('broadcastMonitor.noAttempts')}
        </Text>
      )}
    </Card>
  );
};
