import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  NotificationListResponse,
  NotificationItem,
  NotificationsQueryParams,
  UnreadCountResponse,
} from '@/types/notifications';

export const notificationService = {
  list: async (params?: NotificationsQueryParams): Promise<NotificationListResponse> => {
    const { data } = await apiClient.get<NotificationListResponse>(
      ENDPOINTS.NOTIFICATIONS.LIST,
      { params },
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
};
