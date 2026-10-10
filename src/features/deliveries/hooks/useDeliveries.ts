import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { deliveryService } from '@/services/deliveryService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useDeliveryBroadcastOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.DELIVERY_BROADCASTS(),
    queryFn: () => deliveryService.list(),
    enabled,
    // Offers expire on their own timeline (5-min rounds server-side) — poll
    // so an expired/claimed-by-someone-else offer disappears without the
    // employee needing to pull-to-refresh. The app-wide WS (useAppSocket.ts)
    // invalidates this instantly on a new offer; this interval only covers
    // expiry/claim-by-others, which the socket doesn't signal.
    refetchInterval: 30_000,
  });

export const useAcceptDeliveryBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => deliveryService.accept(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(String(orderId)) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Delivery accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclineDeliveryBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => deliveryService.decline(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useSetEmployeeOnlineStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { is_online: boolean; latitude?: number | null; longitude?: number | null }) =>
      deliveryService.setOnlineStatus(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
      queryClient.setQueryData(QUERY_KEYS.EMPLOYEE_ONLINE_STATUS, data);
      // No toast here - this mutation also fires on every GPS location
      // tick while already online, which would otherwise show "You're
      // online" on a loop for a moving employee. The explicit manual
      // toggle shows its own toast right at the call site instead.
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
