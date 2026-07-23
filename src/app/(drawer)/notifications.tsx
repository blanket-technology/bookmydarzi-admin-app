import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { EmptyState, Header, Pagination, SkeletonList } from '@/components/ui';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotifications,
} from '@/features/notifications/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import type { NotificationItem } from '@/types/notifications';
import { formatApiErrorDetail } from '@/utils/errors';

const LIMIT = 20;

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  order_update: 'receipt-outline',
  payment: 'wallet-outline',
  promo: 'pricetag-outline',
  support: 'help-buoy-outline',
  chat: 'chatbubble-ellipses-outline',
  system: 'notifications-outline',
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

// Deep-link target derived from Notification.Data (see
// app/models/notification.py — e.g. {"order_id": 12}). Only order deep
// links are wired today since that's the only drawer route with a detail
// screen keyed by an id from this payload shape.
const resolveDeepLink = (notification: NotificationItem): string | null => {
  const orderId = notification.data?.order_id;
  if (orderId !== undefined && orderId !== null) {
    return `/(drawer)/orders/${orderId}`;
  }
  return null;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ page, limit: LIMIT }), [page]);
  const { data, isLoading, isError, error, refetch, isRefetching } = useNotifications(params);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications = data?.notifications ?? [];
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

    return (
      <Pressable
        onPress={() => handlePress(item)}
        className="flex-row rounded-3xl p-4 mb-3 border"
        style={{
          backgroundColor: item.is_read ? colors.card : `${colors.primary}0d`,
          borderColor: item.is_read ? colors.border : `${colors.primary}40`,
        }}
      >
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          <Ionicons name={icon} size={20} color={colors.primary} />
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
            {!item.is_read ? (
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
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

      <View className="px-5 flex-1">
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
