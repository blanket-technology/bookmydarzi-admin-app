import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { pickupService } from '@/services/pickupService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const usePickupBroadcastOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.PICKUP_BROADCASTS(),
    queryFn: () => pickupService.list(),
    enabled,
    // Offers expire on their own timeline (5-min rounds server-side) — poll
    // so an expired/claimed-by-someone-else offer disappears without a manual
    // pull-to-refresh. The app-wide WS toast complements this for instant
    // arrival.
    refetchInterval: 30_000,
  });

export const useAcceptPickupBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => pickupService.accept(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pickup accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclinePickupBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => pickupService.decline(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useSetPickupOnlineStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { is_online: boolean; latitude?: number | null; longitude?: number | null }) =>
      pickupService.setOnlineStatus(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
      queryClient.setQueryData(QUERY_KEYS.EMPLOYEE_ONLINE_STATUS, data);
      toast.success(data.is_online ? "You're online" : "You're offline");
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// GET /employee/me/online - read-side status for the dashboard hero pill,
// so it reflects real server state instead of a static "Go online" label
// that never changes after the user actually goes online.
export const useEmployeeOnlineStatus = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_ONLINE_STATUS,
    queryFn: () => pickupService.getOnlineStatus(),
    enabled,
  });
