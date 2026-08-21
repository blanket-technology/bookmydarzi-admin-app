import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { notificationService } from '@/features/notifications/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { isExpoGo } from '@/utils/expoGo';

const platformName = (): 'android' | 'ios' | 'web' => {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
};

// Registers this device's Expo push token with the backend so the existing
// push infrastructure (send_push / the broadcast-notification feature) can
// actually reach it — previously nothing in the app ever called
// getExpoPushTokenAsync or POST /notifications/device-tokens, so the
// Settings screen's "Push Notifications" toggle controlled nothing real.
// Runs once per authenticated session; unregisters on logout.
export const usePushRegistration = () => {
  const { isAuthenticated } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (registeredTokenRef.current) {
        const token = registeredTokenRef.current;
        registeredTokenRef.current = null;
        notificationService.unregisterDeviceToken(token, platformName()).catch(() => {
          // Best-effort — the token expiring/rotating server-side on its own
          // isn't worth surfacing to the user on logout.
        });
      }
      return;
    }

    if (isExpoGo) return;

    let cancelled = false;

    const register = async () => {
      try {
        if (!Device.isDevice) return; // simulators/emulators can't get a real push token

        // Dynamic import so expo-notifications' own module-level side
        // effects never run under Expo Go (guarded above) - a static
        // top-level import would still execute them for every user
        // regardless of the isExpoGo check.
        const Notifications = await import('expo-notifications');

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: expoToken } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !expoToken) return;

        await notificationService.registerDeviceToken(expoToken, platformName());
        registeredTokenRef.current = expoToken;
      } catch {
        // Push registration is a background enhancement, not a blocking
        // requirement — a device that can't get a token (no EAS project
        // configured yet, permission denied, etc.) should not affect the
        // rest of the app.
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
};
