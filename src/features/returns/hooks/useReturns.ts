import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { returnService } from '@/services/returnService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useReturnBroadcastOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.RETURN_BROADCASTS(),
    queryFn: () => returnService.list(),
    enabled,
    // Same reasoning as useDeliveryBroadcastOffers: offers expire on their
    // own timeline (5-min rounds server-side); poll to catch expiry/claim-
    // by-others that the app-wide WS invalidation doesn't cover.
    refetchInterval: 30_000,
  });

export const useAcceptReturnBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => returnService.accept(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['return-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(String(orderId)) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Return pickup accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclineReturnBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => returnService.decline(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkReturnInTransitMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => returnService.markInTransit(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Marked as in transit');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkReturnCompleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => returnService.markComplete(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Return marked complete');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
