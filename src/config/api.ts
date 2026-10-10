// Release builds must never fall back to a developer's LAN address: if the
// build forgot EXPO_PUBLIC_API_BASE_URL every request would fail with a
// confusing "network error". Dev builds keep the local default.
const DEFAULT_BASE_URL = __DEV__
  ? 'http://192.168.1.29:8000'
  : 'https://web-production-efff7.up.railway.app';

export const API_CONFIG = {
  BASE_URL: (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
  TIMEOUT: 30_000,
  API_VERSION: 'v1',
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;

if (__DEV__) {
  console.log('[API Config] BASE_URL:', API_CONFIG.BASE_URL);
}
export const getApiUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_CONFIG.BASE_URL}${normalized}`;
};
