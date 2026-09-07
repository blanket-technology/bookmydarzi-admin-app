import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

/** Admin-only recovery tools footer. Extracted unchanged from
 * orders/[id].tsx - currently just the force-restart-broadcast action. */
export const AdminToolsSection = ({
  onTriggerBroadcast,
  triggering,
}: {
  onTriggerBroadcast: () => void;
  triggering: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View className="mt-2">
      <Text className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1" style={{ color: colors.textMuted }}>
        Admin Tools
      </Text>
      <Pressable
        onPress={onTriggerBroadcast}
        disabled={triggering}
        className="flex-row items-center justify-center py-3 rounded-2xl border mb-3"
        style={{ borderColor: colors.border, opacity: triggering ? 0.6 : 1 }}
      >
        <Ionicons name="radio-outline" size={16} color={colors.textSecondary} />
        <Text className="ml-2 text-sm font-semibold" style={{ color: colors.textSecondary }}>
          {triggering ? 'Triggering…' : 'Force Restart Broadcast'}
        </Text>
      </Pressable>
    </View>
  );
};
