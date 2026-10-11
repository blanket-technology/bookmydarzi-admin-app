import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

interface StickyActionBarProps {
  /** What the user is about to do, as a button label ("Mark as picked up"). */
  label: string;
  onPress: () => void;
  loading?: boolean;
  /** Why the action is blocked, shown under the disabled button. */
  disabledReason?: string;
  /** Optional line above the button (what happens next / amount to collect). */
  hint?: string;
}

/**
 * Pinned primary action for field roles (tailor / bridge). The next step on an
 * order is the one thing they come to the screen for; keeping it docked at the
 * bottom means it is always one thumb-tap away instead of at the end of a long
 * scroll.
 */
export const StickyActionBar = ({ label, onPress, loading, disabledReason, hint }: StickyActionBarProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();
  return (
    <View
      className="px-5 pt-3 border-t items-center"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View className="w-full" style={{ maxWidth: Math.min(contentMaxWidth, 600) }}>
        {hint ? (
          <Text className="text-xs mb-2 text-center" style={{ color: colors.textSecondary }}>
            {hint}
          </Text>
        ) : null}
        <Button
          title={label}
          variant="primary"
          size="lg"
          onPress={onPress}
          loading={loading}
          disabled={!!disabledReason}
          fullWidth
        />
        {disabledReason ? (
          <Text className="text-xs mt-1.5 text-center" style={{ color: colors.textMuted }}>
            {disabledReason}
          </Text>
        ) : null}
      </View>
    </View>
  );
};
