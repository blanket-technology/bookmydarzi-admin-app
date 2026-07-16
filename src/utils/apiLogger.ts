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

export const logApiError = (error: AxiosError | unknown) => {
  if (!__DEV__) return;

  const axiosError = error as AxiosError;
  const url = axiosError.config
    ? `${axiosError.config.baseURL ?? API_CONFIG.BASE_URL}${axiosError.config.url ?? ''}`
    : 'unknown';

  if (axiosError.response) {
    console.error('[API Error]', {
      url,
      method: axiosError.config?.method?.toUpperCase(),
      status: axiosError.response.status,
      statusText: axiosError.response.statusText,
      responseBody: axiosError.response.data,
      message: axiosError.message,
      code: axiosError.code,
    });
    return;
  }

  console.error('[API Error]', {
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
