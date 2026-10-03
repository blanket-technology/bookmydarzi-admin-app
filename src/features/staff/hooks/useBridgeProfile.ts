import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { bridgeProfileService } from '@/services/bridgeProfileService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { BridgeProfileSelfUpdateRequest } from '@/types/bridgeProfile';

export const useMyBridgeProfile = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_BRIDGE_PROFILE,
    queryFn: () => bridgeProfileService.getMy(),
    enabled,
  });

export const useUpdateMyBridgeProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BridgeProfileSelfUpdateRequest) => bridgeProfileService.updateMy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_BRIDGE_PROFILE });
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Real per-leg payout ledger - replaces the old client-side derived
// "sum of my completed orders" approximation (useMyEarningsSummary).
export const useMyBridgePayouts = (
  params: { page?: number; limit?: number; status?: 'pending' | 'paid' },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_PAYOUTS('bridge', params as Record<string, unknown>),
    queryFn: () => bridgeProfileService.getMyPayouts(params),
    enabled,
  });

export const useMyBridgePayoutSummary = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_PAYOUT_SUMMARY('bridge'),
    queryFn: () => bridgeProfileService.getMyPayoutSummary(),
    enabled,
  });
