import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  BroadcastNotificationRequest,
  BroadcastNotificationResponse,
  NotificationListResponse,
  NotificationItem,
  NotificationsQueryParams,
  UnreadCountResponse,
} from '@/types/notifications';

export const notificationService = {
  list: async (params?: NotificationsQueryParams): Promise<NotificationListResponse> => {
    // GET /notifications accepts `type` as repeatable OR comma-separated
    // (see its docstring) - sending one comma-joined string sidesteps
    // axios's default `type[]=a&type[]=b` array serialization, which
    // FastAPI's Query(None) param wouldn't parse the way this array is
    // intended (repeated bare `type=a&type=b`, not bracketed).
    const { type, ...rest } = params ?? {};
    const { data } = await apiClient.get<NotificationListResponse>(
      ENDPOINTS.NOTIFICATIONS.LIST,
      { params: { ...rest, type: type?.length ? type.join(',') : undefined } },
    );
    return data;
  },

  unreadCount: async (): Promise<UnreadCountResponse> => {
    const { data } = await apiClient.get<UnreadCountResponse>(
      ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
    );
    return data;
  },

  markRead: async (notificationId: string): Promise<NotificationItem> => {
    const { data } = await apiClient.patch<NotificationItem>(
      ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
    );
    return data;
  },

  markAllRead: async (): Promise<{ message: string; updated: number }> => {
    const { data } = await apiClient.post<{ message: string; updated: number }>(
      ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
    );
    return data;
  },

  registerDeviceToken: async (token: string, platform: 'android' | 'ios' | 'web'): Promise<void> => {
    await apiClient.post(ENDPOINTS.NOTIFICATIONS.DEVICE_TOKENS, { token, platform });
  },

  unregisterDeviceToken: async (
    token: string,
    platform: 'android' | 'ios' | 'web',
  ): Promise<void> => {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DEVICE_TOKENS, { data: { token, platform } });
  },

  broadcast: async (payload: BroadcastNotificationRequest): Promise<BroadcastNotificationResponse> => {
    const { data } = await apiClient.post<BroadcastNotificationResponse>(
      ENDPOINTS.NOTIFICATIONS.ADMIN_BROADCAST,
      payload,
    );
    return data;
  },
};
