import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/config/api';

const maskToken = (token?: string | null): string => {
  if (!token) return '(none)';
  if (token.length <= 12) return '***';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

export const logApiRequest = (
  config: InternalAxiosRequestConfig,
  accessToken?: string | null,
) => {
  if (!__DEV__) return;

  const url = `${config.baseURL ?? API_CONFIG.BASE_URL}${config.url ?? ''}`;
  const headers = { ...config.headers } as Record<string, unknown>;
  if (headers.Authorization) {
    headers.Authorization = `Bearer ${maskToken(accessToken)}`;
  }

  console.log('[API Request]', {
    method: (config.method ?? 'GET').toUpperCase(),
    url,
    headers,
    accessToken: maskToken(accessToken),
    params: config.params,
  });
};

export const logApiResponse = (
  url: string,
  status: number,
  data: unknown,
) => {
  if (!__DEV__) return;

  console.log('[API Response]', {
    url,
    status,
    data,
  });
};

// 4xx client errors the app already renders proper UI feedback for (wrong
// credentials, validation errors, not-found) are expected traffic, not bugs —
// logging them as console.error triggers Expo's red-screen overlay and makes
// a normal "user mistyped their password" look like a crash. Only genuinely
// unexpected failures (5xx, network errors, and 401s outside the login flow,
// which usually mean a stale/invalid session) warrant console.error.
const isExpectedClientError = (status: number, url: string): boolean => {
  if (status === 404 || status === 422) return true;
  if (status === 401 && url.includes('/auth/')) return true;
  return false;
};

export const logApiError = (error: AxiosError | unknown, willRetry = false) => {
  if (!__DEV__) return;

  const axiosError = error as AxiosError;
  const url = axiosError.config
    ? `${axiosError.config.baseURL ?? API_CONFIG.BASE_URL}${axiosError.config.url ?? ''}`
    : 'unknown';

  if (axiosError.response) {
    const status = axiosError.response.status;
    const log = isExpectedClientError(status, url) ? console.warn : console.error;
    log('[API Error]', {
      url,
      method: axiosError.config?.method?.toUpperCase(),
      status,
      statusText: axiosError.response.statusText,
      responseBody: axiosError.response.data,
      message: axiosError.message,
      code: axiosError.code,
    });
    return;
  }

  // A no-response error that's about to be retried is expected transient
  // noise (Railway's hobby-tier containers sleep when idle and take a few
  // seconds to wake on a cold request) - only escalate to console.error
  // (which triggers Expo's red-screen overlay) once retries are exhausted.
  const log = willRetry ? console.warn : console.error;
  log(`[API ${willRetry ? 'Retry' : 'Error'}]`, {
    url,
    method: axiosError.config?.method?.toUpperCase(),
    message: axiosError.message,
    code: axiosError.code ?? 'NETWORK_ERROR',
    hint:
      axiosError.code === 'ECONNABORTED'
        ? 'Request timed out'
        : 'No response — check device can reach backend (same Wi‑Fi, correct IP, server running)',
  });
};
