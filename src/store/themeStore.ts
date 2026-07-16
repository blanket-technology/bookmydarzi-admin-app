import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage';
import { secureStorage } from '@/utils/secureStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const zustandStorage = {
  getItem: async (name: string) => {
    const value = await secureStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await secureStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await secureStorage.removeItem(name);
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: STORAGE_KEYS.THEME,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
