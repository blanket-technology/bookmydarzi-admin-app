import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage';
import { secureStorage } from '@/utils/secureStorage';

interface BiometricState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const zustandStorage = {
  getItem: async (name: string) => (await secureStorage.getItem(name)) ?? null,
  setItem: async (name: string, value: string) => secureStorage.setItem(name, value),
  removeItem: async (name: string) => secureStorage.removeItem(name),
};

// Whether the app should require Face ID/fingerprint after cold start (or
// after being backgrounded — see useBiometricLock). Off by default: opt-in,
// not a default that could lock an admin out on a device with no biometrics
// enrolled.
export const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: STORAGE_KEYS.BIOMETRIC_LOCK,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
