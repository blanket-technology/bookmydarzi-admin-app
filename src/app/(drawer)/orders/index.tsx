import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrdersFilterSheet, type OrdersFilters } from '@/features/orders/components/OrdersFilterSheet';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
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
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const { user, selectedRole } = useAuth();
  const role = String(user?.role ?? selectedRole ?? '').toLowerCase();
  const isTailorRole = role === 'tailor';
  // A tailor only ever sees their own orders via GET /orders/my-orders (see
  // useOrders.ts), which only forwards page/limit/status - the
  // Tailor/payment-status/date-range filters and the "Needs Tailor" toggle
  // below are all admin/employee-only concepts that would otherwise
  // silently do nothing for a tailor (or, for the Tailor filter
  // specifically, trigger a call to the admin-only GET /admin/tailors and
  // likely 403).
  const showAdminFilters = !isTailorRole;
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
              {isTailorRole ? item.service_name ?? t('orders.service') : `${item.customer_name ?? t('orders.customer')} · ${item.service_name ?? t('orders.service')}`}
            </Text>
            {!isTailorRole ? (
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('orders.tailorLabel')}: {item.tailor_name ?? t('orders.unassigned')}
              </Text>
            ) : null}
            {item.needs_manual_assignment ? (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="warning" size={12} color={colors.error} />
                <Text className="text-xs font-bold" style={{ color: colors.error }}>
                  {t('orders.noTailorFound')}
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
          {!isTailorRole ? (
            <Text className="font-bold" style={{ color: colors.primary }}>
              {formatCurrency(item.final_amount ?? item.amount)}
            </Text>
          ) : null}
        </View>
        {!isTailorRole && typeof item.remaining_amount === 'number' && item.remaining_amount > 0 ? (
          <Text className="text-xs mt-1" style={{ color: colors.error }}>
            {t('orders.balanceDue')}: {formatCurrency(item.remaining_amount)}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('orders.title')}
        subtitle={t('orders.totalOrders', { count: data?.total ?? 0 })}
        rightAction={
          <Pressable
            onPress={() => setFilterVisible(true)}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{ backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="filter" size={20} color={activeFilterCount > 0 ? colors.onPrimary : colors.text} />
            {activeFilterCount > 0 ? (
              <View
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-[10px] font-bold" style={{ color: colors.onError }}>{activeFilterCount}</Text>
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
          placeholder={t('orders.searchPlaceholder')}
        />

        {showAdminFilters ? (
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
              {t('orders.needsTailor')}
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title={t('orders.failedToLoad')}
            description={formatApiErrorDetail(error)}
            actionLabel={t('common.retry')}
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
                title={t('orders.noOrdersFound')}
                description={t('orders.adjustFilters')}
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
        showAdminFilters={showAdminFilters}
        onApply={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
    </View>
  );
}
