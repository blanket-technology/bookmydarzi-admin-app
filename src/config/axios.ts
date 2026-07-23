import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { AuthTokenResponse } from '@/types/auth';
import { logApiError, logApiRequest, logApiResponse } from '@/utils/apiLogger';
import { enrichApiError, parseApiError } from '@/utils/errors';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else if (token) promise.resolve(token);
  });
  refreshQueue = [];
};

const clearSession = async () => {
  useAuthStore.getState().logout();
  await tokenStorage.clearAll();
};

const isAuthRoute = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes(ENDPOINTS.AUTH.LOGIN) ||
    url.includes(ENDPOINTS.AUTH.LOGIN_VERIFY_OTP) ||
    url.includes(ENDPOINTS.AUTH.LOGIN_RESEND_OTP) ||
    url.includes(ENDPOINTS.AUTH.REFRESH) ||
    url.includes(ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST) ||
    url.includes(ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY) ||
    url.includes(ENDPOINTS.AUTH.FORGOT_PASSWORD_RESET)
  );
};

const resolveAccessToken = async (): Promise<string | null> => {
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) return storeToken;

  const secureToken = await tokenStorage.getAccessToken();
  if (!secureToken) return null;

  const refreshToken =
    useAuthStore.getState().refreshToken ?? (await tokenStorage.getRefreshToken());
  if (refreshToken) {
    useAuthStore.getState().setTokens(secureToken, refreshToken);
  }

  return secureToken;
};

const normalizeRefreshTokens = (data: Record<string, unknown>) => ({
  access_token: String(data.access_token ?? data.accessToken ?? data.token ?? ''),
  refresh_token: String(data.refresh_token ?? data.refreshToken ?? ''),
});

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await resolveAccessToken();
    if (accessToken && !isAuthRoute(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else if (!accessToken && !isAuthRoute(config.url) && __DEV__) {
      console.warn('[API] No access token for protected route:', config.url);
    }

    logApiRequest(config, accessToken);
    return config;
  },
  (error) => {
    logApiError(error);
    return Promise.reject(enrichApiError(parseApiError(error), error));
  },
);

apiClient.interceptors.response.use(
  (response) => {
    const url = `${response.config.baseURL ?? ''}${response.config.url ?? ''}`;
    logApiResponse(url, response.status, response.data);
    return response;
  },
  async (error: AxiosError) => {
    logApiError(error);

    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(enrichApiError(parseApiError(error), error));
    }

    const status = error.response?.status;
    const requestUrl = `${originalRequest.baseURL ?? ''}${originalRequest.url ?? ''}`;

    if (status === 401 && !originalRequest._retry && !isAuthRoute(originalRequest.url)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        useAuthStore.getState().refreshToken ?? (await tokenStorage.getRefreshToken());

      if (!refreshToken) {
        isRefreshing = false;
        await clearSession();
        return Promise.reject(
          enrichApiError(
            {
              message: 'Session expired. Please sign in again.',
              status: 401,
              code: 'REFRESH_TOKEN_MISSING',
            },
            error,
            requestUrl,
          ),
        );
      }

      try {
        console.log('[API] Refreshing access token...');
        const response = await axios.post<AuthTokenResponse>(
          `${API_CONFIG.BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: API_CONFIG.TIMEOUT },
        );

        const tokens = normalizeRefreshTokens(
          response.data as unknown as Record<string, unknown>,
        );

        if (!tokens.access_token) {
          throw new Error('Refresh response missing access_token');
        }

        useAuthStore.getState().refreshSession(tokens.access_token, tokens.refresh_token);
        await tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
        processQueue(null, tokens.access_token);

        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        logApiError(refreshError);
        processQueue(refreshError, null);
        await clearSession();
        return Promise.reject(
          enrichApiError(
            {
              message: 'Session expired. Please sign in again.',
              status: 401,
              code: 'REFRESH_TOKEN_EXPIRED',
              details: parseApiError(refreshError),
            },
            refreshError,
            requestUrl,
          ),
        );
      } finally {
        isRefreshing = false;
      }
    }

    if (!error.response) {
      return Promise.reject(enrichApiError(parseApiError(error), error, requestUrl));
    }

    if (status && status >= 500) {
      return Promise.reject(
        enrichApiError(
          {
            message: `Server error (${status}). Please try again later.`,
            status,
            code: 'SERVER_ERROR',
            details: error.response.data,
          },
          error,
          requestUrl,
        ),
      );
    }

    if (status === 401 && isAuthRoute(originalRequest.url)) {
      return Promise.reject(
        enrichApiError(
          {
            message: 'Invalid email or password.',
            status: 401,
            code: 'INVALID_CREDENTIALS',
            details: parseApiError(error),
          },
          error,
          requestUrl,
        ),
      );
    }

    if (status === 403) {
      return Promise.reject(
        enrichApiError(
          {
            message: 'Access forbidden. Your account may not have admin permissions.',
            status: 403,
            code: 'FORBIDDEN',
            details: error.response.data,
          },
          error,
          requestUrl,
        ),
      );
    }

    if (status === 404) {
      return Promise.reject(
        enrichApiError(
          {
            message: `Endpoint not found: ${originalRequest.url}`,
            status: 404,
            code: 'NOT_FOUND',
            details: error.response.data,
          },
          error,
          requestUrl,
        ),
      );
    }

    return Promise.reject(enrichApiError(parseApiError(error), error, requestUrl));
  },
);

export default apiClient;
