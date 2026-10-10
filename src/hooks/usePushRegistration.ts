import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { notificationService } from '@/features/notifications/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { isExpoGo } from '@/utils/expoGo';

const platformName = (): 'android' | 'ios' | 'web' => {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
};

let handlerConfigured = false;

// The token registered for this session, held at module level so logout can
// unregister it WHILE the user is still authenticated. (Doing it from an effect
// after logout meant a credential-less DELETE -> 401 -> a false "Session
// expired" modal, and the token stayed active for the next person on the phone.)
let registeredPushToken: string | null = null;

export async function unregisterPushTokenBestEffort(): Promise<void> {
  const token = registeredPushToken;
  registeredPushToken = null;
  if (!token) return;
  try {
    await notificationService.unregisterDeviceToken(token, platformName());
  } catch {
    // Best-effort - the token rotating or expiring server-side is not worth surfacing.
  }
}

// Controls whether a notification alerts (sound/banner) while the app is in
// the FOREGROUND - without this, expo-notifications' default handler
// suppresses foreground alerts entirely on some platforms, which made it
// look like notifications "only sometimes" worked. This has no effect on
// background/killed-app delivery (that's the OS + Android notification
// channel's job, see the MAX-importance channel set up below) but every
// state should behave consistently, so it's set regardless.
export function configureNotificationHandler(): void {
  if (handlerConfigured || isExpoGo) return;
  handlerConfigured = true;
  import('expo-notifications')
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    })
    .catch(() => {
      // Same best-effort posture as push registration below - a device
      // that can't load expo-notifications shouldn't block app startup.
    });
}

// Registers this device's Expo push token with the backend so the existing
// push infrastructure (send_push / the broadcast-notification feature) can
// actually reach it — previously nothing in the app ever called
// getExpoPushTokenAsync or POST /notifications/device-tokens, so the
// Settings screen's "Push Notifications" toggle controlled nothing real.
// Runs once per authenticated session; unregisters on logout.
export const usePushRegistration = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

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
          // MAX (not DEFAULT) - broadcast job offers and order alerts are
          // time-sensitive for a tailor/Bridge partner deciding whether to
          // accept a job. DEFAULT importance lets many OEMs suppress the
          // heads-up popup and sound once the app is backgrounded or the
          // device is locked, which made notifications look like they
          // silently stopped working outside the foreground.
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: expoToken } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !expoToken) return;

        await notificationService.registerDeviceToken(expoToken, platformName());
        registeredPushToken = expoToken;
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
