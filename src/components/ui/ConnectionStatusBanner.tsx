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
import { useAuthStore } from '@/store/authStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useWsStatusStore } from '@/store/wsStatusStore';

// The real-time WebSocket (useAppSocket.ts) can be dead - mid-reconnect
// after a server restart, a brief blip that killed the TCP connection but
// not general connectivity, or the gap right after the app comes back to
// the foreground - while the device's own network is perfectly fine.
// Previously there was zero visible signal for this: a staff member could
// be sitting on a silently-dead real-time connection, missing new-offer
// alerts entirely until the next 30s poll happened to catch up, with
// nothing on screen suggesting anything was wrong.
//
// Deliberately does NOT show for the "connecting" state - that's the
// normal first second or two after every login/app launch, and flashing a
// warning banner on every cold start would train staff to ignore it. Only
// shows once the socket has actually gone from connected to disconnected
// (a real drop) - and never on top of OfflineBanner, which already covers
// "no internet at all" with a clearer, more accurate message.
export const ConnectionStatusBanner = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const wsStatus = useWsStatusStore((s) => s.status);
  const { isConnected, isResolved } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  const deviceOnline = isResolved && isConnected;
  const show = isAuthenticated && deviceOnline && wsStatus === 'disconnected';

  useEffect(() => {
    if (show) {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(80, { duration: 250, easing: Easing.in(Easing.quad) });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [show, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={show ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#b45309',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 8,
          zIndex: 9998,
        },
        animStyle,
      ]}
    >
      <Ionicons name="sync-outline" size={18} color="#fff" />
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.2 }}>
        Reconnecting live updates…
      </Text>
    </Animated.View>
  );
};
