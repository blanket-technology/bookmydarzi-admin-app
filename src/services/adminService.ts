import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import { toast } from '@/store/toastStore';
import type { DashboardResponse } from '@/types/dashboard';
import { isDashboardResponseValid, normalizeDashboardResponse } from '@/utils/dashboard';

export const adminService = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await apiClient.get<unknown>(ENDPOINTS.ADMIN.DASHBOARD);

    if (__DEV__) {
      console.log('Dashboard API Response:', JSON.stringify(response.data, null, 2));
    }

    if (response.data == null) {
      toast.error('Dashboard data unavailable. Showing default values.');
      return normalizeDashboardResponse(null);
    }

    if (!isDashboardResponseValid(response.data)) {
      if (__DEV__) {
        console.warn('[adminService] Unrecognized dashboard response shape — using defaults');
      }
      toast.error('Dashboard data format unexpected. Showing default values.');
    }

    return normalizeDashboardResponse(response.data);
  },
};
