import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { payoutService } from '@/services/payoutService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type {
  CommissionRateCreateRequest,
  PayoutListParams,
  PayoutMarkPaidRequest,
} from '@/types/payouts';

export const usePayouts = (params: PayoutListParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.PAYOUTS(params as Record<string, unknown>),
    queryFn: () => payoutService.list(params),
    enabled,
  });

export const usePayoutSummary = (tailorId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.PAYOUT_SUMMARY(tailorId),
    queryFn: () => payoutService.summary(tailorId),
    enabled: enabled && !!tailorId,
  });

export const useMarkPayoutPaidMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, payload }: { payoutId: string; payload: PayoutMarkPaidRequest }) =>
      payoutService.markPaid(payoutId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
      toast.success('Payout marked paid');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCommissionRates = (tailorId?: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.COMMISSION_RATES(tailorId),
    queryFn: () => payoutService.listCommissionRates(tailorId),
    enabled,
  });

export const useUpsertCommissionRateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommissionRateCreateRequest) => payoutService.upsertCommissionRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      toast.success('Commission rate saved');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteCommissionRateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rateId: string) => payoutService.deleteCommissionRate(rateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      toast.success('Commission rate deleted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
