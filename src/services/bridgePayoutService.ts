import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  BridgeLegRate,
  BridgeLegRateCreateRequest,
  BridgePayout,
  BridgePayoutListParams,
  BridgePayoutListResponse,
  BridgePayoutMarkPaidRequest,
  BridgePayoutSummary,
} from '@/types/bridgePayouts';

export const bridgePayoutService = {
  list: async (params: BridgePayoutListParams): Promise<BridgePayoutListResponse> => {
    const { data } = await apiClient.get<BridgePayoutListResponse>(ENDPOINTS.ADMIN.BRIDGE_PAYOUTS, { params });
    return data;
  },

  summary: async (employeeId: string): Promise<BridgePayoutSummary> => {
    const { data } = await apiClient.get<BridgePayoutSummary>(ENDPOINTS.ADMIN.BRIDGE_PAYOUT_SUMMARY(employeeId));
    return data;
  },

  markPaid: async (payoutId: string, payload: BridgePayoutMarkPaidRequest): Promise<BridgePayout> => {
    const { data } = await apiClient.patch<BridgePayout>(ENDPOINTS.ADMIN.BRIDGE_PAYOUT_MARK_PAID(payoutId), payload);
    return data;
  },

  listLegRates: async (employeeId?: string): Promise<BridgeLegRate[]> => {
    const { data } = await apiClient.get<BridgeLegRate[]>(ENDPOINTS.ADMIN.BRIDGE_LEG_RATES, {
      params: employeeId ? { employee_id: employeeId } : undefined,
    });
    return data;
  },

  upsertLegRate: async (payload: BridgeLegRateCreateRequest): Promise<BridgeLegRate> => {
    const { data } = await apiClient.post<BridgeLegRate>(ENDPOINTS.ADMIN.BRIDGE_LEG_RATES, payload);
    return data;
  },

  deleteLegRate: async (rateId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.ADMIN.BRIDGE_LEG_RATE_DETAIL(rateId));
  },
};
