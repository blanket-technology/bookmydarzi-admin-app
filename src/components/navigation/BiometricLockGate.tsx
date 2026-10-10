import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Button, Loader } from '@/components/ui';
import { useBiometricStore } from '@/store/biometricStore';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';

interface BiometricLockGateProps {
  children: ReactNode;
}

// Only lock after the app has been away this long. Opening the camera, the photo
// picker, a maps link or the dialer backgrounds the app for a few seconds and
// must not demand Face ID on return (nor drop the screen the user was on).
const RELOCK_AFTER_MS = 30_000;

// Re-prompts for Face ID/fingerprint when the app returns after a real absence.
// The app stays MOUNTED underneath: the lock screen is an overlay, so navigation
// state and in-progress work (an upload, a half-filled form) survive an unlock.
export const BiometricLockGate = ({ children }: BiometricLockGateProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const enabled = useBiometricStore((s) => s.enabled);
  const locked = useBiometricStore((s) => s.locked);
  const setLocked = useBiometricStore((s) => s.setLocked);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);
  const leftAt = useRef<number | null>(null);
  const promptingRef = useRef(false);

  const promptUnlock = useCallback(async () => {
    if (promptingRef.current) return; // the system prompt itself emits inactive/active
    promptingRef.current = true;
    setAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Nothing enrolled on this device - don't lock the user out of their own
        // app over a setting that can no longer be satisfied.
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('appLock.prompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
    } catch {
      // A failing biometric API leaves the app locked with the Unlock button.
    } finally {
      promptingRef.current = false;
      setAuthenticating(false);
    }
  }, [setLocked, t]);

  useEffect(() => {
    if (enabled) {
      setLocked(true);
      void promptUnlock();
    } else {
      setLocked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasAway = appState.current.match(/inactive|background/);
      if (nextState === 'background') {
        leftAt.current = leftAt.current ?? Date.now();
      }
      if (enabled && wasAway && nextState === 'active') {
        const awayFor = leftAt.current ? Date.now() - leftAt.current : 0;
        if (awayFor >= RELOCK_AFTER_MS) {
          setLocked(true);
          void promptUnlock();
        }
        leftAt.current = null;
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [enabled, promptUnlock, setLocked]);

  // Clear the runtime flag if this gate goes away (logout) so popups are not stuck hidden.
  useEffect(() => () => setLocked(false), [setLocked]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        // Nothing underneath is reachable or readable by a screen reader while locked.
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={locked}
      >
        {children}
      </View>
      {locked ? (
        <View
          className="items-center justify-center px-8"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
        >
          {authenticating ? (
            <Loader message={t('appLock.verifying')} />
          ) : (
            <>
              <View
                className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Ionicons name="finger-print-outline" size={40} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold mb-2 text-center" style={{ color: colors.text }}>
                {t('appLock.title')}
              </Text>
              <Text className="text-sm mb-6 text-center" style={{ color: colors.textSecondary }}>
                {t('appLock.hint')}
              </Text>
              <Button title={t('appLock.unlock')} onPress={() => void promptUnlock()} fullWidth />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
};
