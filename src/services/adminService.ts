import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import { toast } from '@/store/toastStore';
import type { DashboardResponse } from '@/types/dashboard';
import { isDashboardResponseValid, normalizeDashboardResponse } from '@/utils/dashboard';

// The dashboard refetches every 20 s: a persistently odd response must warn once,
// not raise an error toast every 20 seconds.
let dashboardProblemShown = false;
const toastDashboardProblemOnce = (message: string): void => {
  if (dashboardProblemShown) return;
  dashboardProblemShown = true;
  toast.error(message);
};

export const adminService = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await apiClient.get<unknown>(ENDPOINTS.ADMIN.DASHBOARD);

    if (__DEV__) {
      console.log('Dashboard API Response:', JSON.stringify(response.data, null, 2));
    }

    if (response.data == null) {
      toastDashboardProblemOnce('Dashboard data unavailable. Showing default values.');
      return normalizeDashboardResponse(null);
    }

    if (!isDashboardResponseValid(response.data)) {
      if (__DEV__) {
        console.warn('[adminService] Unrecognized dashboard response shape — using defaults');
      }
      toastDashboardProblemOnce('Dashboard data format unexpected. Showing default values.');
    }

    return normalizeDashboardResponse(response.data);
  },

  // Plain-text CSV, not JSON - StreamingResponse with a Content-Disposition
  // filename (see app/api/v1/endpoints/admin.py's admin_dashboard_export).
  // responseType 'text' avoids axios's default JSON.parse attempt on a
  // response that isn't JSON.
  exportDashboardCsv: async (): Promise<string> => {
    const { data } = await apiClient.get<string>(ENDPOINTS.ADMIN.DASHBOARD_EXPORT, {
      responseType: 'text',
      transformResponse: (res) => res,
    });
    return data;
  },
};
