import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { bridgePayoutService } from '@/services/bridgePayoutService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type {
  BridgeLegRateCreateRequest,
  BridgePayoutListParams,
  BridgePayoutMarkPaidRequest,
} from '@/types/bridgePayouts';

export const useBridgePayouts = (params: BridgePayoutListParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.BRIDGE_PAYOUTS(params as Record<string, unknown>),
    queryFn: () => bridgePayoutService.list(params),
    enabled,
  });

export const useBridgePayoutSummary = (employeeId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.BRIDGE_PAYOUT_SUMMARY(employeeId),
    queryFn: () => bridgePayoutService.summary(employeeId),
    enabled: enabled && !!employeeId,
  });

export const useMarkBridgePayoutPaidMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, payload }: { payoutId: string; payload: BridgePayoutMarkPaidRequest }) =>
      bridgePayoutService.markPaid(payoutId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bridge-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['bridge-payout-summary'] });
      toast.success('Payout marked paid');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useBridgeLegRates = (employeeId?: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.BRIDGE_LEG_RATES(employeeId),
    queryFn: () => bridgePayoutService.listLegRates(employeeId),
    enabled,
  });

export const useUpsertBridgeLegRateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BridgeLegRateCreateRequest) => bridgePayoutService.upsertLegRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bridge-leg-rates'] });
      toast.success('Rate saved');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteBridgeLegRateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rateId: string) => bridgePayoutService.deleteLegRate(rateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bridge-leg-rates'] });
      toast.success('Rate deleted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
