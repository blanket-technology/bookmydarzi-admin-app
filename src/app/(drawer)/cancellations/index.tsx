import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { useCancellations } from '@/features/cancellations/hooks/useCancellations';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { CancellationListItem } from '@/types/cancellations';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 15;

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  refunded: { bg: '#FBF3DF', color: '#7D622A' },
  contact_support: { bg: '#ede9fe', color: '#7c3aed' },
};

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Refunded', value: 'refunded' },
];

export default function CancellationsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const params = useMemo(
    () => ({ skip: (page - 1) * LIMIT, limit: LIMIT, status: status || undefined }),
    [page, status],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useCancellations(params);
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const renderItem = ({ item }: { item: CancellationListItem }) => {
    const badge = STATUS_BADGE[item.Status] ?? { bg: colors.surface, color: colors.textSecondary };
    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/cancellations/${item.Id}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {item.OrderCode ?? `Order #${item.OrderId}`}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.CustomerName ?? 'Customer'} · {item.CustomerPhone ?? '—'}
            </Text>
          </View>
          <Badge
            label={item.Status.replace(/_/g, ' ')}
            backgroundColor={badge.bg}
            color={badge.color}
          />
        </View>
        <View
          className="flex-row items-center justify-between mt-3 pt-3 border-t"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {formatDate(item.CreatedAt)}
          </Text>
          <Text className="font-bold" style={{ color: colors.primary }}>
            Refund: {formatCurrency(item.OverrideRefundAmount ?? item.RefundAmount)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Cancellations"
        subtitle={`${data?.total ?? 0} requests`}
        rightAction={
          <Pressable
            onPress={() => router.push('/(drawer)/cancellations/policy')}
            hitSlop={8}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </Pressable>
        }
      />
      <View className="px-5 pt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-full border"
            style={{
              backgroundColor: status === f.value ? colors.primary : colors.surface,
              borderColor: status === f.value ? colors.primary : colors.border,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: status === f.value ? '#fff' : colors.text }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-5 flex-1 mt-3 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load cancellations"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.Id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="close-circle-outline" title="No cancellation requests" />
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
