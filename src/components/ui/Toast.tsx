import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastType } from '@/store/toastStore';
import { useTheme } from '@/hooks/useTheme';

// Icon carries the type distinction visually instead of relying on callers
// embedding an emoji character in the message string (inconsistent, and
// reads as unpolished vs. a designed icon+color pairing).
const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

export const Toast = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { visible, id, message, type, hide } = useToastStore();

  // Keyed on `id` so a second toast shown while one is up gets its own full
  // 3 s instead of inheriting the first one's remaining time.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(hide, type === 'error' ? 4500 : 3000);
    return () => clearTimeout(timer);
  }, [visible, id, type, hide]);

  if (!visible) return null;

  // Themed surface (card/border) in both light and dark mode, with only the
  // icon/text tinted by the semantic type color - avoids the old fixed pale
  // green/red/cream backgrounds, which stayed light-mode-bright and looked
  // out of place floating over a dark screen.
  const accentColor = colors[type];

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="none"
      // Announced by screen readers (errors assertively).
      accessibilityRole="alert"
      accessibilityLiveRegion={type === 'error' ? 'assertive' : 'polite'}
      className="absolute left-5 right-5 rounded-2xl px-4 py-3 border z-50"
      style={{
        top: insets.top + 8,
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
        <Ionicons name={ICONS[type]} size={17} color={accentColor} />
        <Text className="text-sm font-semibold text-center flex-shrink" style={{ color: colors.text }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};
