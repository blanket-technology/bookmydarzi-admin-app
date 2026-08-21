import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { BillingConfig, BillingSettingsUpdateRequest } from '@/types/billing';

export const billingService = {
  get: async (): Promise<BillingConfig> => {
    const { data } = await apiClient.get<BillingConfig>(ENDPOINTS.ADMIN.BILLING_SETTINGS);
    return data;
  },

  update: async (payload: BillingSettingsUpdateRequest): Promise<BillingConfig> => {
    const { data } = await apiClient.patch<BillingConfig>(ENDPOINTS.ADMIN.BILLING_SETTINGS, payload);
    return data;
  },
};
