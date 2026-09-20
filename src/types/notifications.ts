// Mirrors backend app/schemas/notification.py + app/models/notification.py.
export type NotificationType =
  | 'order_update'
  | 'payment'
  | 'support'
  | 'chat'
  | 'promo'
  | 'broadcast_offer'
  | 'staff_alert'
  | 'system_alert'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: NotificationType | string;
  priority: NotificationPriority | string;
  // Typed client route (e.g. "order_details") set by the backend's
  // NotificationPolicy - see app/services/notifications/policy.py.
  deep_link?: string | null;
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
  /** One or more categories to filter to - e.g. ["order_update", "payment"]. */
  type?: string[];
}

// Mirrors app/schemas/notification.py's BroadcastNotificationRequest/
// Response - admin-only, rate-limited 5/minute (see admin.py's
// broadcast_notification). Mirrors final's BroadcastModal.jsx.
export interface BroadcastNotificationRequest {
  title: string;
  body: string;
  type: string;
  target_role: 'user' | 'tailor' | 'employee' | 'admin' | 'superadmin';
}

export interface BroadcastNotificationResponse {
  message: string;
  recipients: number;
}

export const BROADCAST_TYPES = ['promo', 'system', 'order_update', 'payment', 'support', 'chat'] as const;

export const BROADCAST_TARGET_ROLES: { value: BroadcastNotificationRequest['target_role']; label: string }[] = [
  { value: 'user', label: 'All Customers' },
  { value: 'tailor', label: 'All Tailors' },
  { value: 'employee', label: 'All Employees' },
  { value: 'admin', label: 'All Admins' },
];

/**
 * Role-aware grouping for the notification screen - separates "needs
 * attention" staff items from routine order/payment/support updates, so
 * admin/employee/tailor don't have to scan one flat feed to find what
 * actually needs action. Purely a display grouping; the underlying data
 * is unchanged.
 */
export const STAFF_ALERT_TYPES: readonly string[] = ['staff_alert', 'system_alert'];
export const TAILOR_JOB_TYPES: readonly string[] = ['broadcast_offer'];

/**
 * Categories relevant to a Bridge/employee's actual job (pickups,
 * deliveries, orders) — deliberately excludes staff_alert (new support
 * ticket / new customer signup — admin triage, not theirs), support/chat
 * (see the separate Support-screen role-scoping fix), and promo. The
 * backend's notification policy still broadcasts staff_alert to
 * UserRole.EMPLOYEE server-side (app/services/notifications/policy.py) for
 * push-notification purposes, but this app filters what's SHOWN in the
 * in-app list via GET /notifications?type=..., not what's sent.
 */
export const EMPLOYEE_RELEVANT_TYPES: readonly string[] = [
  'order_update',
  'broadcast_offer',
  'payment',
  'system_alert',
  'system',
];
