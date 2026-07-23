import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  Badge,
  EmptyState,
  FilterSheet,
  Header,
  Pagination,
  SearchBar,
  SkeletonList,
} from '@/components/ui';
import { ORDER_STATUS_COLORS, ORDER_STATUS_OPTIONS, orderStatusLabel } from '@/constants/orderStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 10;

export default function OrdersScreen() {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  const params = useMemo(
    () => ({ page, limit: LIMIT, search: search || undefined, status: status || undefined }),
    [page, search, status],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useOrders(params);

  const orders = data?.orders ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const renderItem = ({ item }: { item: AdminOrderItem }) => {
    const statusColor = ORDER_STATUS_COLORS[item.status] ?? colors.primary;

    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/orders/${item.order_id}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {item.order_code ?? item.order_id}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.customer_name ?? 'Customer'} · {item.service_name ?? 'Service'}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Tailor: {item.tailor_name ?? 'Unassigned'}
            </Text>
          </View>
          <Badge
            label={orderStatusLabel(item.status)}
            backgroundColor={`${statusColor}20`}
            color={statusColor}
          />
        </View>
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {formatDate(item.created_at)}
          </Text>
          <Text className="font-bold" style={{ color: colors.primary }}>
            {formatCurrency(item.final_amount ?? item.amount)}
          </Text>
        </View>
        {typeof item.remaining_amount === 'number' && item.remaining_amount > 0 ? (
          <Text className="text-xs mt-1" style={{ color: colors.error }}>
            Balance due: {formatCurrency(item.remaining_amount)}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Orders"
        subtitle={`${data?.total ?? 0} total orders`}
        rightAction={
          <Pressable
            onPress={() => setFilterVisible(true)}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="filter" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <View className="px-5 flex-1">
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search orders..."
        />

        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load orders"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.order_id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title="No orders found"
                description="Try adjusting your search or filters"
              />
            }
            ListFooterComponent={
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            }
          />
        )}
      </View>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Filter by Status"
        options={ORDER_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
        selectedValue={status}
        onSelect={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
    </View>
  );
}
