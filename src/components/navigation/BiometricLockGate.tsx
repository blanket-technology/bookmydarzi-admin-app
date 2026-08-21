import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Button, Loader } from '@/components/ui';
import { useBiometricStore } from '@/store/biometricStore';
import { useTheme } from '@/hooks/useTheme';

interface BiometricLockGateProps {
  children: ReactNode;
}

// Re-prompts for Face ID/fingerprint whenever the app returns to the
// foreground after being backgrounded (not just on cold start) — the
// standard expectation for an app-level lock, since the OS itself already
// handles cold-start app-switcher previews/blur.
export const BiometricLockGate = ({ children }: BiometricLockGateProps) => {
  const { colors } = useTheme();
  const enabled = useBiometricStore((s) => s.enabled);
  const [locked, setLocked] = useState(enabled);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  const promptUnlock = async () => {
    setAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Nothing enrolled on this device — don't lock the user out of
        // their own app over a setting that can no longer be satisfied.
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock BookMyDarzi Admin',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
      }
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      setLocked(true);
      promptUnlock();
    } else {
      setLocked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        enabled &&
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        setLocked(true);
        promptUnlock();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!locked) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.background }}>
      {authenticating ? (
        <Loader message="Verifying..." />
      ) : (
        <>
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="finger-print-outline" size={40} color={colors.primary} />
          </View>
          <Text className="text-lg font-bold mb-2 text-center" style={{ color: colors.text }}>
            App Locked
          </Text>
          <Text className="text-sm mb-6 text-center" style={{ color: colors.textSecondary }}>
            Unlock with Face ID or fingerprint to continue.
          </Text>
          <Button title="Unlock" onPress={promptUnlock} fullWidth />
        </>
      )}
    </View>
  );
};
