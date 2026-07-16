import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { logApiError } from '@/utils/apiLogger';

export interface ApiDiagnosticResult {
  baseUrl: string;
  endpoint: string;
  fullUrl: string;
  timestamp: string;
  storeAccessToken: string | null;
  storeRefreshToken: string | null;
  secureAccessToken: string | null;
  secureRefreshToken: string | null;
  isAuthenticated: boolean;
  docsReachable: boolean;
  docsStatus?: number;
  docsError?: string;
  dashboardStatus?: number;
  dashboardOk: boolean;
  dashboardBody: unknown;
  dashboardError?: string;
  authorizationSent: boolean;
}

const mask = (token: string | null): string | null => {
  if (!token) return null;
  return `${token.slice(0, 8)}...${token.slice(-4)} (${token.length} chars)`;
};

export const runApiDiagnostics = async (): Promise<ApiDiagnosticResult> => {
  const { accessToken, refreshToken, isAuthenticated } = useAuthStore.getState();
  const secureAccessToken = await tokenStorage.getAccessToken();
  const secureRefreshToken = await tokenStorage.getRefreshToken();
  const token = accessToken ?? secureAccessToken;

  const fullUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.ADMIN.DASHBOARD}`;
  const result: ApiDiagnosticResult = {
    baseUrl: API_CONFIG.BASE_URL,
    endpoint: ENDPOINTS.ADMIN.DASHBOARD,
    fullUrl,
    timestamp: new Date().toISOString(),
    storeAccessToken: mask(accessToken),
    storeRefreshToken: mask(refreshToken),
    secureAccessToken: mask(secureAccessToken),
    secureRefreshToken: mask(secureRefreshToken),
    isAuthenticated,
    docsReachable: false,
    dashboardOk: false,
    dashboardBody: null,
    authorizationSent: !!token,
  };

  try {
    const docsResponse = await axios.get(`${API_CONFIG.BASE_URL}/docs`, {
      timeout: 8_000,
      validateStatus: () => true,
    });
    result.docsReachable = docsResponse.status < 500;
    result.docsStatus = docsResponse.status;
  } catch (error) {
    result.docsError = error instanceof Error ? error.message : 'Docs unreachable';
    logApiError(error);
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log('[API Diagnostics] GET dashboard', { fullUrl, authorizationSent: !!token });

    const dashboardResponse = await axios.get(fullUrl, {
      headers,
      timeout: API_CONFIG.TIMEOUT,
      validateStatus: () => true,
    });

    result.dashboardStatus = dashboardResponse.status;
    result.dashboardOk = dashboardResponse.status >= 200 && dashboardResponse.status < 300;
    result.dashboardBody = dashboardResponse.data;

    console.log('[API Diagnostics] Dashboard result', {
      status: dashboardResponse.status,
      data: dashboardResponse.data,
    });
  } catch (error) {
    result.dashboardError = error instanceof Error ? error.message : 'Dashboard request failed';
    logApiError(error);
  }

  return result;
};
