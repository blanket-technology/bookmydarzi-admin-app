import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Mirrors react_app's OfflineBanner (src/components/common variant lives
// there) so both apps give the same offline signal. Mounts only after
// NetInfo resolves to avoid a false-offline flash on cold start; React
// Query's own onlineManager (wired in AppProviders.tsx) handles the
// auto-retry-on-reconnect behavior — this component is purely the visual cue.
export const OfflineBanner = () => {
  const { isConnected, isResolved } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  const offline = isResolved && !isConnected;

  useEffect(() => {
    if (offline) {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(80, { duration: 250, easing: Easing.in(Easing.quad) });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [offline, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!isResolved) return null;

  return (
    <Animated.View
      pointerEvents={offline ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1F2937',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 8,
          zIndex: 9999,
        },
        animStyle,
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.2 }}>
        No internet connection
      </Text>
    </Animated.View>
  );
};
