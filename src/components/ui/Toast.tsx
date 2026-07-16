import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/toastStore';

const COLORS = {
  success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  info: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
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
      <Text className="text-sm font-semibold text-center" style={{ color: palette.text }}>
        {message}
      </Text>
    </Animated.View>
  );
};
