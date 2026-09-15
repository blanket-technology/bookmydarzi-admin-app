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
// unexpected failures (5xx, network errors, and 401s the axios interceptor
// itself isn't already about to handle) warrant console.error.
//
// A 401 outside the login flow that the interceptor is about to attempt a
// silent token refresh for (see axios.ts's response interceptor) is exactly
// the scenario this whole refresh machinery exists to handle gracefully -
// whether it resolves via a successful refresh or ends in
// REFRESH_TOKEN_MISSING/EXPIRED (session genuinely stale, e.g. after the app
// sat backgrounded past token expiry - see useAutoOnline.ts's foreground
// re-check, whose own try/catch already silently handles this), it's
// expected traffic, not a crash. `willAttemptRefresh` lets the interceptor
// tell the logger this BEFORE the refresh outcome is known, since the log
// call happens up front on the raw error.
const isExpectedClientError = (status: number, url: string, willAttemptRefresh = false): boolean => {
  if (status === 404 || status === 422) return true;
  if (status === 401 && url.includes('/auth/')) return true;
  if (status === 401 && willAttemptRefresh) return true;
  return false;
};

export const logApiError = (error: AxiosError | unknown, willRetry = false, willAttemptRefresh = false) => {
  if (!__DEV__) return;

  const axiosError = error as AxiosError;
  const url = axiosError.config
    ? `${axiosError.config.baseURL ?? API_CONFIG.BASE_URL}${axiosError.config.url ?? ''}`
    : 'unknown';

  if (axiosError.response) {
    const status = axiosError.response.status;
    const log = isExpectedClientError(status, url, willAttemptRefresh) ? console.warn : console.error;
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
