import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotifications,
} from '@/features/notifications/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  EMPLOYEE_RELEVANT_TYPES,
  STAFF_ALERT_TYPES,
  TAILOR_JOB_TYPES,
  type NotificationItem,
} from '@/types/notifications';
import { formatApiErrorDetail } from '@/utils/errors';

const LIMIT = 20;

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  order_update: 'receipt-outline',
  payment: 'wallet-outline',
  promo: 'pricetag-outline',
  support: 'help-buoy-outline',
  chat: 'chatbubble-ellipses-outline',
  broadcast_offer: 'megaphone-outline',
  staff_alert: 'alert-circle-outline',
  system_alert: 'warning-outline',
  system: 'notifications-outline',
};

// "Needs Attention" - items that require someone to act, shown ahead of
// routine order/payment/support updates so they don't get lost in the feed.
// Role-scoped: a tailor's "new job offer" alert only matters to tailors, an
// admin's "needs review" alert only matters to admin/superadmin. Employee
// gets its own delivery-offer-focused set below (staff_alert - new tickets/
// signups - is admin triage, not Bridge's job; see EMPLOYEE_RELEVANT_TYPES).
const needsAttentionTypesForRole = (role: string | undefined): readonly string[] => {
  if (role === 'tailor') return TAILOR_JOB_TYPES;
  if (role === 'employee') return TAILOR_JOB_TYPES; // broadcast_offer - delivery offers
  if (role === 'admin' || role === 'superadmin') return STAFF_ALERT_TYPES;
  return [];
};

// GET /notifications?type=... to filter — employee sees only categories
// relevant to their actual job (see EMPLOYEE_RELEVANT_TYPES's comment for
// why staff_alert/support/chat/promo are excluded). Every other role sees
// its full feed as before (undefined -> no filter param sent).
const notificationTypeFilterForRole = (role: string | undefined): string[] | undefined =>
  role === 'employee' ? [...EMPLOYEE_RELEVANT_TYPES] : undefined;

const PRIORITY_ACCENT: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
};

const timeAgo = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// Deep-link target derived from the backend's typed `deep_link` field (see
// app/services/notifications/policy.py) plus Notification.Data for the id.
// Only routes that actually exist in this app's drawer are wired - the
// rest (payment/refund/pickup/progress-gallery screens don't exist here
// yet) fall through to the order-id inference or no-op, same honest
// behavior as before rather than guessing at a route.
const resolveDeepLink = (notification: NotificationItem): string | null => {
  const orderId = notification.data?.order_id;
  const applicationId = notification.data?.application_id;
  const ticketId = notification.data?.ticket_id;
  const sessionId = notification.data?.session_id;

  switch (notification.deep_link) {
    case 'order_details':
    case 'payment_details':
    case 'payment_retry':
    case 'delivery_details':
    case 'pickup_details':
    case 'progress_gallery':
      if (orderId != null) return `/(drawer)/orders/${orderId}`;
      break;
    case 'tailor_application_details':
      if (applicationId != null) return `/(drawer)/applications/${applicationId}`;
      break;
    case 'support_ticket_details':
      if (ticketId != null) return `/(drawer)/support/tickets/${ticketId}`;
      break;
    case 'support_conversation':
      if (sessionId != null) return `/(drawer)/support/chat/${sessionId}`;
      break;
    default:
      break;
  }

  // Fallback for notifications created before deep_link existed, or any
  // type not covered above - infer from whichever id is present.
  if (orderId != null) return `/(drawer)/orders/${orderId}`;
  if (ticketId != null) return `/(drawer)/support/tickets/${ticketId}`;
  return null;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({ page, limit: LIMIT, type: notificationTypeFilterForRole(user?.role) }),
    [page, user?.role],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useNotifications(params);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const attentionTypes = useMemo(() => needsAttentionTypesForRole(user?.role), [user?.role]);

  // Needs-attention items float to the top within the current page, so a
  // role-relevant "needs review"/"new job offer" alert never gets buried
  // under routine order-update chatter - same flat list/card UI, just
  // resorted client-side rather than a separate section list.
  const notifications = useMemo(() => {
    let raw = data?.notifications ?? [];
    const q = search.trim().toLowerCase();
    // GET /notifications has no `search` param on the backend - filter
    // client-side over the current page, same pattern as the Support inbox's
    // Conversations tab.
    if (q) {
      raw = raw.filter(
        (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
      );
    }
    if (attentionTypes.length === 0) return raw;
    const attention: NotificationItem[] = [];
    const rest: NotificationItem[] = [];
    for (const n of raw) {
      (attentionTypes.includes(n.type) ? attention : rest).push(n);
    }
    return [...attention, ...rest];
  }, [data?.notifications, attentionTypes, search]);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const handlePress = (item: NotificationItem) => {
    if (!item.is_read) {
      markReadMutation.mutate(String(item.id));
    }
    const target = resolveDeepLink(item);
    if (target) {
      router.push(target as never);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = TYPE_ICON[item.type] ?? 'notifications-outline';
    const accent = PRIORITY_ACCENT[item.priority];
    const isAttention = attentionTypes.includes(item.type);

    return (
      <Pressable
        onPress={() => handlePress(item)}
        className="flex-row rounded-3xl p-4 mb-3 border"
        style={{
          backgroundColor: item.is_read ? colors.card : `${colors.primary}0d`,
          borderColor: accent ?? (item.is_read ? colors.border : `${colors.primary}40`),
          borderLeftWidth: accent ? 3 : StyleSheet.hairlineWidth,
        }}
      >
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: `${accent ?? colors.primary}20` }}
        >
          <Ionicons name={icon} size={20} color={accent ?? colors.primary} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className="font-semibold flex-1 mr-2"
              style={{ color: colors.text }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isAttention ? (
              <View className="px-2 py-0.5 rounded-full mr-1" style={{ backgroundColor: `${colors.primary}20` }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>
                  ACTION
                </Text>
              </View>
            ) : null}
            {!item.is_read ? (
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: accent ?? colors.primary }} />
            ) : null}
          </View>
          <Text className="text-sm mt-1" style={{ color: colors.textSecondary }} numberOfLines={2}>
            {item.body}
          </Text>
          <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Notifications"
        subtitle={
          data && data.unread_count > 0 ? `${data.unread_count} unread` : 'Stay updated'
        }
        rightAction={
          data && data.unread_count > 0 ? (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="px-3 py-2 rounded-xl border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search title or body..." />
        {isLoading ? (
          <SkeletonList count={6} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Unable to load notifications"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="notifications-outline"
                title="No notifications"
                description="New alerts about your orders and account will appear here"
              />
            }
            ListFooterComponent={
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            }
          />
        )}
      </View>
    </View>
  );
}
