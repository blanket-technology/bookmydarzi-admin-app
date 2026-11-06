import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card, Loader } from '@/components/ui';
import { useOrderTracking } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { formatDateTime } from '@/utils/errors';

// Bug fix: for any order that left the happy path (cancelled, return,
// repair), OrderStepper deliberately renders nothing ("the status badge
// already says so" - see its own comment), and no screen ever called
// GET /orders/{id}/tracking - so a tailor (or anyone else) viewing one of
// these orders saw only the raw status badge and, if a repair/cancel
// reason existed, that text with no timing at all: no "when was this
// cancelled," no "how long has the return been pending." The backend
// already builds a complete timeline (per-step timestamp + the real
// cancellation reason as `note`) via order_tracking_builder.py - this
// just finally renders it. Safe for every role the order detail screen
// itself is safe for (same assert_can_view_order gate as GET /orders/{id}).
export const OrderTrackingTimeline = ({ orderId }: { orderId: string }) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { data, isLoading } = useOrderTracking(orderId);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Loader message={t('orderDetail.loadingTimeline')} />
      </Card>
    );
  }

  const steps = data?.timeline ?? [];
  if (steps.length === 0) return null;

  return (
    <Card className="mb-4">
      <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
        {t('orderDetail.timeline')}
      </Text>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor = step.current ? colors.primary : step.completed ? colors.success : colors.border;
        return (
          <View key={`${step.status}-${index}`} className="flex-row">
            <View className="items-center mr-3" style={{ width: 20 }}>
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
              {!isLast ? (
                <View className="flex-1 w-0.5 mt-1" style={{ backgroundColor: colors.border, minHeight: 24 }} />
              ) : null}
            </View>
            <View className="flex-1 pb-4">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm font-semibold flex-1 mr-2"
                  style={{ color: step.completed || step.current ? colors.text : colors.textMuted }}
                >
                  {step.title}
                </Text>
                {step.timestamp ? (
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {formatDateTime(step.timestamp)}
                  </Text>
                ) : null}
              </View>
              {step.description ? (
                <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {step.description}
                </Text>
              ) : null}
              {step.note ? (
                <View
                  className="flex-row items-start mt-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ backgroundColor: colors.background }}
                >
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
                  <Text className="text-xs ml-1.5 flex-1" style={{ color: colors.textSecondary }}>
                    {step.note}
                  </Text>
                </View>
              ) : null}
              {step.partner ? (
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {step.partner.name}
                  {step.partner.mobile ? ` · ${step.partner.mobile}` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
};
