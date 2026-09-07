import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/toastStore';

const COLORS = {
  success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  info: { bg: '#FBF3DF', text: '#7D622A', border: '#EAD599' },
};

// Icon carries the type distinction visually instead of relying on callers
// embedding an emoji character in the message string (inconsistent, and
// reads as unpolished vs. a designed icon+color pairing).
const ICONS: Record<keyof typeof COLORS, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

export const Toast = () => {
  const insets = useSafeAreaInsets();
  const { visible, message, type, hide } = useToastStore();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(hide, 3000);
    return () => clearTimeout(timer);
  }, [visible, hide]);

  if (!visible) return null;

  const palette = COLORS[type];

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      className="absolute left-5 right-5 rounded-2xl px-4 py-3 border z-50"
      style={{
        top: insets.top + 8,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
        <Ionicons name={ICONS[type]} size={17} color={palette.text} />
        <Text className="text-sm font-semibold text-center flex-shrink" style={{ color: palette.text }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};
