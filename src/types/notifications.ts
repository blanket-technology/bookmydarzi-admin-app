// Mirrors backend app/schemas/notification.py + app/models/notification.py.
export type NotificationType =
  | 'order_update'
  | 'payment'
  | 'promo'
  | 'support'
  | 'chat'
  | 'system';

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: NotificationType | string;
  // Deep-link payload, e.g. { order_id: 12 } — see Notification.Data in the
  // backend model. Shape varies by type, so kept loose here.
  data?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationsQueryParams {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}
