import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { repairPickupService } from '@/services/repairPickupService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useRepairPickupBroadcastOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.REPAIR_PICKUP_BROADCASTS(),
    queryFn: () => repairPickupService.list(),
    enabled,
    // Same reasoning as useReturnBroadcastOffers: offers expire on their
    // own timeline (5-min rounds server-side); poll to catch expiry/claim-
    // by-others that the app-wide WS invalidation doesn't cover.
    refetchInterval: 30_000,
  });

export const useAcceptRepairPickupBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairPickupService.accept(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['repair-pickup-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(String(orderId)) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Repair pickup accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclineRepairPickupBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairPickupService.decline(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-pickup-broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkRepairPickupInTransitMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairPickupService.markInTransit(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Marked as in transit');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkRepairPickupDeliveredToTailorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairPickupService.markDeliveredToTailor(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Delivered to tailor');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
