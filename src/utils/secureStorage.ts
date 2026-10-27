import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// iOS Keychain access can hang indefinitely on a fresh install/TestFlight
// build before the device has unlocked once (ACCESSIBLE_AFTER_FIRST_UNLOCK-
// class entitlements aren't guaranteed available at cold launch) - this
// adapter backs zustand's persist middleware (see authStore.ts), so a hang
// here blocks session hydration forever with nothing downstream able to
// recover (the 3s hydration-timeout fallback in authContext.tsx can only
// fire once the JS event loop is free to run its timer, which never
// happens if this promise itself never settles). A hard timeout here
// guarantees every Keychain call eventually resolves one way or another.
const KEYCHAIN_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), KEYCHAIN_TIMEOUT_MS)),
  ]);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    try {
      return await withTimeout(SecureStore.getItemAsync(key), null);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      await withTimeout(SecureStore.setItemAsync(key, value), undefined);
    } catch {
      // Best-effort - a session that fails to persist just needs to log in
      // again next launch, same as before this fix.
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    try {
      await withTimeout(SecureStore.deleteItemAsync(key), undefined);
    } catch {
      // Best-effort.
    }
  },
};
