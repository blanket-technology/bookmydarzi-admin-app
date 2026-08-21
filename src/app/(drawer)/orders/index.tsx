import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrdersFilterSheet, type OrdersFilters } from '@/features/orders/components/OrdersFilterSheet';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminOrderItem } from '@/types/orders';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 10;
const EMPTY_FILTERS: OrdersFilters = {
  status: '',
  paymentStatus: '',
  tailorId: '',
  dateFrom: '',
  dateTo: '',
};

export default function OrdersScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  // Optional deep-link filter: dashboard KPI cards navigate here with
  // ?status=<order_status> so each card lands on a pre-filtered list instead
  // of the same unfiltered Orders screen. Only `status` is honored to keep the
  // entry point simple; the in-screen filter sheet still drives everything else.
  const { status: statusParam } = useLocalSearchParams<{ status?: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<OrdersFilters>(
    statusParam ? { ...EMPTY_FILTERS, status: statusParam } : EMPTY_FILTERS,
  );
  const [filterVisible, setFilterVisible] = useState(false);
  const [needsManualAssignment, setNeedsManualAssignment] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search || undefined,
      status: filters.status || undefined,
      payment_status: filters.paymentStatus || undefined,
      tailor_id: filters.tailorId || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      needs_manual_assignment: needsManualAssignment || undefined,
    }),
    [page, search, filters, needsManualAssignment],
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
        style={{
          backgroundColor: item.needs_manual_assignment ? `${colors.error}0D` : colors.card,
          borderColor: item.needs_manual_assignment ? colors.error : colors.border,
        }}
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
            {item.needs_manual_assignment ? (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="warning" size={12} color={colors.error} />
                <Text className="text-xs font-bold" style={{ color: colors.error }}>
                  No tailor found — assign manually
                </Text>
              </View>
            ) : null}
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
            style={{ backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="filter" size={20} color={activeFilterCount > 0 ? '#fff' : colors.text} />
            {activeFilterCount > 0 ? (
              <View
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-[10px] font-bold text-white">{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search orders..."
        />

        <Pressable
          onPress={() => {
            setNeedsManualAssignment((prev) => !prev);
            setPage(1);
          }}
          className="flex-row items-center gap-1.5 self-start px-3 py-1.5 rounded-full border mb-3"
          style={{
            backgroundColor: needsManualAssignment ? colors.error : colors.surface,
            borderColor: needsManualAssignment ? colors.error : colors.border,
          }}
        >
          <Ionicons name="warning" size={14} color={needsManualAssignment ? '#fff' : colors.text} />
          <Text
            className="text-xs font-bold"
            style={{ color: needsManualAssignment ? '#fff' : colors.text }}
          >
            Needs Tailor
          </Text>
        </Pressable>

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

      <OrdersFilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
    </View>
  );
}
