import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { notificationService } from '@/features/notifications/services/notificationService';
import type { NotificationsQueryParams } from '@/types/notifications';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// The backend has no WebSocket/Redis pub-sub channel for the Notification
// model (fire_event is only wired for chat + order broadcast — see
// app/core/websocket_manager.py). "Realtime" here means polling, matching
// what the backend actually supports without inventing a new push channel.
const UNREAD_COUNT_POLL_MS = 30_000;
const LIST_POLL_MS = 30_000;

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
