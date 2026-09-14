import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage';
import { secureStorage } from '@/utils/secureStorage';
import { setLanguage, type AppLanguage } from '@/i18n';

interface LanguageStore {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

// Same storage-adapter shape as themeStore.ts, using this app's existing
// secureStorage rather than pulling in a new AsyncStorage dependency.
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

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en' as AppLanguage,
      setLanguage: (lang) => {
        setLanguage(lang); // update the module-level variable too
        set({ language: lang });
      },
    }),
    {
      name: STORAGE_KEYS.LANGUAGE,
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) setLanguage(state.language);
      },
    },
  ),
);
