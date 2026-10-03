import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { BridgeProfileSelf, BridgeProfileSelfUpdateRequest } from '@/types/bridgeProfile';
import type { BridgePayoutListParams, BridgePayoutListResponse, BridgePayoutSummary } from '@/types/bridgePayouts';

export const bridgeProfileService = {
  getMy: async (): Promise<BridgeProfileSelf> => {
    const { data } = await apiClient.get<BridgeProfileSelf>(ENDPOINTS.EMPLOYEE.MY_BRIDGE_PROFILE);
    return data;
  },

  updateMy: async (payload: BridgeProfileSelfUpdateRequest): Promise<BridgeProfileSelf> => {
    const { data } = await apiClient.patch<BridgeProfileSelf>(
      ENDPOINTS.EMPLOYEE.MY_BRIDGE_PROFILE,
      payload,
    );
    return data;
  },

  // Real per-leg payout ledger (GET /employee/me/payouts), scoped
  // server-side to the caller's own EmployeeId - replaces the old
  // client-side derived "sum of my completed orders" approximation.
  getMyPayouts: async (
    params: Omit<BridgePayoutListParams, 'employee_id'>,
  ): Promise<BridgePayoutListResponse> => {
    const { data } = await apiClient.get<BridgePayoutListResponse>(ENDPOINTS.EMPLOYEE.MY_PAYOUTS, { params });
    return data;
  },

  getMyPayoutSummary: async (): Promise<BridgePayoutSummary> => {
    const { data } = await apiClient.get<BridgePayoutSummary>(ENDPOINTS.EMPLOYEE.MY_PAYOUT_SUMMARY);
    return data;
  },
};
