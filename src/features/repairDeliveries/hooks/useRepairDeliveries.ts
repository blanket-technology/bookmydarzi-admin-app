import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { repairDeliveryService } from '@/services/repairDeliveryService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useRepairDeliveryBroadcastOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.REPAIR_DELIVERY_BROADCASTS(),
    queryFn: () => repairDeliveryService.list(),
    enabled,
    refetchInterval: 30_000,
  });

export const useAcceptRepairDeliveryBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairDeliveryService.accept(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-delivery-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Repair delivery accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclineRepairDeliveryBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairDeliveryService.decline(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-delivery-broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkRepairDeliveryInTransitMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairDeliveryService.markInTransit(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Marked as in transit');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useMarkRepairDeliveryCompleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => repairDeliveryService.markComplete(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Repair delivery marked complete');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
