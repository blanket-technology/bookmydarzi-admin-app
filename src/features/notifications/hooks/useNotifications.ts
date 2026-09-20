import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { notificationService } from '@/features/notifications/services/notificationService';
import type { BroadcastNotificationRequest, NotificationsQueryParams } from '@/types/notifications';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// Primary delivery is now the app-wide WebSocket (useAppSocket.ts, mounted
// in AppProviders) - create_notification/broadcast_notification fire a
// NOTIFICATION event over the same "user:{id}" room chat/broadcasts already
// use, and the socket handler pushes new rows straight into this hook's
// query cache. This polling interval is only a fallback for the gap while
// reconnecting (app was backgrounded, network blip, etc.), not the primary
// path - kept far less aggressive than before since it no longer carries
// the main delivery burden.
const UNREAD_COUNT_POLL_MS = 90_000;
const LIST_POLL_MS = 90_000;

export const useNotifications = (params?: NotificationsQueryParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS(params as Record<string, unknown>),
    queryFn: () => notificationService.list(params),
    enabled,
    refetchInterval: enabled ? LIST_POLL_MS : false,
  });

export const useUnreadNotificationCount = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT,
    queryFn: notificationService.unreadCount,
    enabled,
    refetchInterval: enabled ? UNREAD_COUNT_POLL_MS : false,
    select: (data) => data.unread_count,
  });

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Admin-only: send a push notification to every user of a role. Mirrors
// final's BroadcastModal.jsx / sendBroadcast. Rate-limited 5/minute
// server-side (admin.py's broadcast_notification).
export const useSendBroadcastMutation = () =>
  useMutation({
    mutationFn: (payload: BroadcastNotificationRequest) => notificationService.broadcast(payload),
    onSuccess: (res) => toast.success(res.message),
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
