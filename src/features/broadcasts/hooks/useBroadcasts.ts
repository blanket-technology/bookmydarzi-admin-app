import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { broadcastService } from '@/services/broadcastService';
import { trackBroadcastAccepted, trackBroadcastDeclined } from '@/services/mixpanelService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useBroadcastOffers = (
  params?: { page?: number; limit?: number },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.BROADCASTS(params as Record<string, unknown>),
    queryFn: () => broadcastService.list(params),
    enabled,
    // Offers expire on their own timeline (5-min rounds server-side) — poll
    // so an expired/claimed-by-someone-else offer disappears without the
    // tailor needing to pull-to-refresh. The app-wide WS (useAppSocket.ts)
    // invalidates this instantly on a new offer; this interval only covers
    // expiry/claim-by-others, which the socket doesn't signal.
    refetchInterval: 30_000,
  });

export const useAcceptBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => broadcastService.accept(orderId),
    onSuccess: (_data, orderId) => {
      trackBroadcastAccepted({ order_id: orderId });
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(String(orderId)) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Order accepted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeclineBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => broadcastService.decline(orderId),
    onSuccess: (_data, orderId) => {
      trackBroadcastDeclined({ order_id: orderId });
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.info('Offer declined');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useSetTailorOnlineStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { is_online: boolean; latitude?: number | null; longitude?: number | null }) =>
      broadcastService.setOnlineStatus(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['tailor', 'me'] });
      // No toast here - this mutation also fires on every GPS location
      // tick while already online, which would otherwise show "You're
      // online" on a loop for a moving tailor. The explicit manual
      // toggle shows its own toast right at the call site instead.
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
