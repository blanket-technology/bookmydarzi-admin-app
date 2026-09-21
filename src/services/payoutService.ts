import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  CommissionRate,
  CommissionRateCreateRequest,
  Payout,
  PayoutListParams,
  PayoutListResponse,
  PayoutMarkPaidRequest,
  TailorPayoutSummary,
} from '@/types/payouts';

export const payoutService = {
  list: async (params: PayoutListParams): Promise<PayoutListResponse> => {
    const { data } = await apiClient.get<PayoutListResponse>(ENDPOINTS.ADMIN.PAYOUTS, { params });
    return data;
  },

  summary: async (tailorId: string): Promise<TailorPayoutSummary> => {
    const { data } = await apiClient.get<TailorPayoutSummary>(ENDPOINTS.ADMIN.PAYOUT_SUMMARY(tailorId));
    return data;
  },

  markPaid: async (payoutId: string, payload: PayoutMarkPaidRequest): Promise<Payout> => {
    const { data } = await apiClient.patch<Payout>(ENDPOINTS.ADMIN.PAYOUT_MARK_PAID(payoutId), payload);
    return data;
  },

  listCommissionRates: async (tailorId?: string): Promise<CommissionRate[]> => {
    const { data } = await apiClient.get<CommissionRate[]>(ENDPOINTS.ADMIN.COMMISSION_RATES, {
      params: tailorId ? { tailor_id: tailorId } : undefined,
    });
    return data;
  },

  upsertCommissionRate: async (payload: CommissionRateCreateRequest): Promise<CommissionRate> => {
    const { data } = await apiClient.post<CommissionRate>(ENDPOINTS.ADMIN.COMMISSION_RATES, payload);
    return data;
  },

  deleteCommissionRate: async (rateId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.ADMIN.COMMISSION_RATE_DETAIL(rateId));
  },
};
