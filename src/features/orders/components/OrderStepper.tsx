import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { t } from '@/i18n';
import { OFF_PATH_STATUSES, WORKFLOW_PHASES, workflowPhaseIndex } from '@/features/orders/workflow';
import { useTheme } from '@/hooks/useTheme';

interface OrderStepperProps {
  status: string | undefined | null;
}

/**
 * Compact progress tracker for the order lifecycle: Placed -> Tailor -> Pickup
 * -> Stitching -> Delivery -> Done. Completed phases get a check, the current
 * phase is highlighted. Orders that left the happy path (cancelled, rejected,
 * returned...) render nothing here; the status badge already says so.
 */
export const OrderStepper = ({ status }: OrderStepperProps) => {
  const { colors } = useTheme();
  if (!status || OFF_PATH_STATUSES.has(String(status))) return null;
  const current = workflowPhaseIndex(status);
  if (current < 0) return null;
  const allDone = WORKFLOW_PHASES[current]?.key === 'done';

  return (
    <View
      className="flex-row items-start"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${t(`workflow.phase.${WORKFLOW_PHASES[current]?.key}`)}, ${current + 1}/${WORKFLOW_PHASES.length}`}
    >
      {WORKFLOW_PHASES.map((phase, index) => {
        const done = index < current || (allDone && index === current);
        const active = index === current && !allDone;
        const dotColor = done ? colors.success : active ? colors.primary : colors.border;
        return (
          <View key={phase.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              <View
                className="flex-1 h-0.5"
                style={{ backgroundColor: index === 0 ? 'transparent' : index <= current ? colors.success : colors.border }}
              />
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{
                  backgroundColor: done || active ? dotColor : colors.surface,
                  borderWidth: 2,
                  borderColor: dotColor,
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : active ? (
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.onPrimary }} />
                ) : null}
              </View>
              <View
                className="flex-1 h-0.5"
                style={{
                  backgroundColor:
                    index === WORKFLOW_PHASES.length - 1 ? 'transparent' : index < current ? colors.success : colors.border,
                }}
              />
            </View>
            <Text
              className="text-[10px] mt-1.5 text-center"
              style={{
                color: active ? colors.primary : done ? colors.textSecondary : colors.textMuted,
                fontWeight: active ? '700' : '500',
              }}
              numberOfLines={1}
            >
              {t(`workflow.phase.${phase.key}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
