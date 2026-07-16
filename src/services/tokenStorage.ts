import { STORAGE_KEYS } from '@/constants/storage';
import { secureStorage } from '@/utils/secureStorage';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async setAccessToken(accessToken: string): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  },
};
