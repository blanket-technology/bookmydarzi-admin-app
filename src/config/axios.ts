import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { refreshAccessToken } from '@/services/refreshCoordinator';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { logApiError, logApiRequest, logApiResponse } from '@/utils/apiLogger';
import { enrichApiError, parseApiError } from '@/utils/errors';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; _networkRetryCount?: number };

/**
 * Max retries + backoff (ms) for network-level (no-response) failures.
 * Railway's hobby-tier containers sleep when idle and can take 5-10s to
 * wake on a cold request - a fast-failing "Network Error" right after idle
 * is usually this, not a real outage. Mirrors react_app's services/api.ts
 * fix for the same symptom.
 */
const MAX_NETWORK_RETRIES = 3;
const NETWORK_RETRY_DELAYS_MS = [3000, 6000, 10000];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const originalRequest = error.config as RetryConfig | undefined;

    // Network-level failure (no response at all) - retry with backoff
    // before giving up, since this is usually a Railway cold-start wake-up
    // rather than a genuine outage. Timeouts (ECONNABORTED) are excluded -
    // a request that already waited out the full timeout once is unlikely
    // to succeed faster on an identical retry.
    if (!error.response && originalRequest && error.code !== 'ECONNABORTED') {
      const retryCount = originalRequest._networkRetryCount ?? 0;
      const willRetry = retryCount < MAX_NETWORK_RETRIES;
      logApiError(error, willRetry);

      if (willRetry) {
        originalRequest._networkRetryCount = retryCount + 1;
        await delay(NETWORK_RETRY_DELAYS_MS[retryCount] ?? NETWORK_RETRY_DELAYS_MS[NETWORK_RETRY_DELAYS_MS.length - 1]);
        return apiClient(originalRequest);
      }
    } else {
      // Mirrors the exact condition below that decides whether this 401
      // triggers the silent-refresh flow - a 401 about to go through that
      // path (successfully refreshed, or ending in a graceful
      // REFRESH_TOKEN_MISSING/EXPIRED session-expiry, both already handled
      // without surfacing anything to the user) shouldn't log as a loud
      // console.error/dev red-screen. See apiLogger.ts's isExpectedClientError.
      const willAttemptRefresh =
        error.response?.status === 401 &&
        !!originalRequest &&
        !(originalRequest as RetryConfig)._retry &&
        !isAuthRoute(originalRequest.url);
      logApiError(error, false, willAttemptRefresh);
    }

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
        useSessionStore.getState().markExpired();
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
        if (__DEV__) console.log('[API] Refreshing access token...');
        // Routed through the shared coordinator (not a raw axios.post here)
        // so this call joins the same in-flight refresh authContext.tsx's
        // boot-time session restore may already have started, instead of
        // racing it with the same refresh token - see refreshCoordinator.ts.
        const tokens = await refreshAccessToken(refreshToken);

        if (!tokens.access_token) {
          throw new Error('Refresh response missing access_token');
        }

        processQueue(null, tokens.access_token);

        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        logApiError(refreshError);
        processQueue(refreshError, null);
        await clearSession();
        useSessionStore.getState().markExpired();
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
            message: 'Something went wrong on our side. Please try again in a moment.',
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
      // Prefer the backend's own message (usually specific and actionable,
      // e.g. "This order is not in the employee operations queue") over a
      // generic string — the generic fallback only covers the case where
      // the backend genuinely sent no detail/message field.
      const parsed = parseApiError(error);
      const hasBackendMessage = parsed.message && parsed.message !== 'Something went wrong';
      return Promise.reject(
        enrichApiError(
          {
            message: hasBackendMessage
              ? parsed.message
              : 'Access forbidden. Your account may not have permission for this action.',
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
      // Bug fix: a 404 from this backend means two very different things -
      // a route that genuinely doesn't exist (FastAPI's bare
      // {"detail":"Not Found"}, no error_code), vs. an app-level "resource
      // not found" exception that deliberately uses status_code=404 (e.g.
      // UserNotFoundException on POST /auth/forgot-password/verify, which
      // sends {"error":"USER_NOT_FOUND","message":"User not found",...}).
      // This branch used to always show "Endpoint not found: <url>"
      // regardless, so a real "no account with that email" response on the
      // Forgot Password screen rendered as if the whole feature were
      // broken. Prefer the backend's own message when it sent one (same
      // pattern as the 403 branch above) and only use the generic
      // route-level wording when it didn't.
      const parsed = parseApiError(error);
      const hasBackendMessage = parsed.message && parsed.message !== 'Something went wrong';
      return Promise.reject(
        enrichApiError(
          {
            message: hasBackendMessage ? parsed.message : `Endpoint not found: ${originalRequest.url}`,
            status: 404,
            code: hasBackendMessage ? (parsed.code ?? 'NOT_FOUND') : 'NOT_FOUND',
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
