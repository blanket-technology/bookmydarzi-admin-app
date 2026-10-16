import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, DueChip, EmptyState, FilterChips, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrdersFilterSheet, type OrdersFilters } from '@/features/orders/components/OrdersFilterSheet';
import { TAILOR_BUCKETS, tailorBucket, type TailorBucket } from '@/features/orders/workflow';
import { orderNextStepHint } from '@/features/orders/workflowHints';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminOrderItem } from '@/types/orders';
import { isDueRelevant } from '@/utils/dueDate';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 10;
// GET /orders/my-orders caps at 50 per page; a tailor's queue is grouped into
// tabs client-side, so fetch the largest page rather than paginating per tab.
const TAILOR_LIMIT = 50;
type BridgeView = 'mine' | 'open' | 'all';
const EMPTY_FILTERS: OrdersFilters = {
  status: '',
  paymentStatus: '',
  tailorId: '',
  dateFrom: '',
  dateTo: '',
};

const itemsSummary = (order: AdminOrderItem): string | null => {
  const items = order.items ?? [];
  if (items.length === 0) return null;
  const parts = items.slice(0, 2).map((i) => `${i.quantity}\u00D7 ${i.service_name ?? ''}`.trim());
  return items.length > 2 ? `${parts.join(', ')} +${items.length - 2}` : parts.join(', ');
};

export default function OrdersScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth, isDesktop } = useResponsive();
  const { user, selectedRole } = useAuth();
  const role = String(user?.role ?? selectedRole ?? '').toLowerCase();
  const isTailorRole = role === 'tailor';
  const isEmployeeRole = role === 'employee';
  const [bucket, setBucket] = useState<TailorBucket | 'all'>('all');
  const [bridgeView, setBridgeView] = useState<BridgeView>('mine');
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
  const { status: statusParam, bucket: bucketParam, ts: tsParam } = useLocalSearchParams<{ status?: string; bucket?: string; ts?: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filters, setFilters] = useState<OrdersFilters>(
    statusParam ? { ...EMPTY_FILTERS, status: statusParam } : EMPTY_FILTERS,
  );
  const [filterVisible, setFilterVisible] = useState(false);

  // The drawer keeps this screen mounted, so a second dashboard card (a different
  // ?status=) must update the filter too, not only the first one.
  useEffect(() => {
    if (statusParam === undefined) return;
    setFilters((prev) => (prev.status === statusParam ? prev : { ...prev, status: statusParam }));
    setPage(1);
  }, [statusParam]);
  // Tailor dashboard tiles deep-link to a tab (?bucket=done). The drawer keeps this screen
  // mounted, so follow the param on every change (and reset to All when it is cleared).
  useEffect(() => {
    if (!isTailorRole) return;
    const next = ['todo', 'stitching', 'ready', 'done'].includes(String(bucketParam)) ? (bucketParam as TailorBucket) : 'all';
    setBucket(next);
    // tsParam changes on every tile tap, so tapping the same tile again re-applies it.
  }, [bucketParam, tsParam, isTailorRole]);
  const [needsManualAssignment, setNeedsManualAssignment] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const params = useMemo(
    () => ({
      page,
      limit: isTailorRole || isEmployeeRole ? TAILOR_LIMIT : LIMIT,
      search: debouncedSearch || undefined,
      status: filters.status || undefined,
      payment_status: filters.paymentStatus || undefined,
      tailor_id: filters.tailorId || undefined,
      date_from: filters.dateFrom || undefined,
      // The backend compares CreatedAt <= date_to as a timestamp, so a bare date
      // would exclude the whole end day: include its last second.
      date_to: filters.dateTo ? `${filters.dateTo}T23:59:59` : undefined,
      needs_manual_assignment: needsManualAssignment || undefined,
    }),
    [page, debouncedSearch, filters, needsManualAssignment, isTailorRole, isEmployeeRole],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useOrders(params);

  const allOrders = data?.orders ?? [];
  const bucketCounts = useMemo(() => {
    const counts: Record<TailorBucket, number> = { todo: 0, stitching: 0, ready: 0, done: 0, closed: 0 };
    for (const order of allOrders) counts[tailorBucket(order.status)] += 1;
    return counts;
  }, [allOrders]);
  // Bridge: "Mine" = legs I hold, "Open" = not yet claimed by anyone (pick up via offers/accept).
  const isMine = (o: AdminOrderItem) =>
    (!!o.assigned_employee_id && String(o.assigned_employee_id) === String(user?.id)) ||
    (!!o.delivery_employee_id && String(o.delivery_employee_id) === String(user?.id));
  const isOpen = (o: AdminOrderItem) => !o.assigned_employee_id && !o.delivery_employee_id;
  const bridgeCounts = {
    mine: allOrders.filter(isMine).length,
    open: allOrders.filter(isOpen).length,
    all: allOrders.length,
  };
  const orders = isTailorRole
    ? bucket !== 'all'
      ? allOrders.filter((o) => tailorBucket(o.status) === bucket)
      : allOrders
    : isEmployeeRole
      ? bridgeView === 'mine'
        ? allOrders.filter(isMine)
        : bridgeView === 'open'
          ? allOrders.filter(isOpen)
          : allOrders
      : allOrders;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (isTailorRole || isEmployeeRole ? TAILOR_LIMIT : LIMIT)));
  const columns = isDesktop ? 2 : 1;

  const renderItem = ({ item }: { item: AdminOrderItem }) => {
    const statusColor = ORDER_STATUS_COLORS[item.status] ?? colors.primary;

    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/orders/${item.order_id}`)}
        className="rounded-3xl p-4 mb-3 border"
        accessibilityLabel={`${item.order_code ?? item.order_id}, ${orderStatusLabel(item.status)}`}
        style={{
          flex: 1,
          maxWidth: columns > 1 ? `${100 / columns - 1}%` : undefined,
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
            {itemsSummary(item) ? (
              <Text className="text-xs mt-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                {itemsSummary(item)}
              </Text>
            ) : null}
            {(isTailorRole || isEmployeeRole) && orderNextStepHint(role, item.status, {
                  myPickup: !!item.assigned_employee_id && String(item.assigned_employee_id) === String(user?.id),
                  myDelivery: !!item.delivery_employee_id && String(item.delivery_employee_id) === String(user?.id),
                }) ? (
              <View className="flex-row items-center mt-2 self-start px-2.5 py-1 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                <Ionicons name="arrow-forward-circle-outline" size={13} color={colors.primary} />
                <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }} numberOfLines={1}>
                  {orderNextStepHint(role, item.status, {
                  myPickup: !!item.assigned_employee_id && String(item.assigned_employee_id) === String(user?.id),
                  myDelivery: !!item.delivery_employee_id && String(item.delivery_employee_id) === String(user?.id),
                })}
                </Text>
              </View>
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
          {item.expected_delivery_date && isDueRelevant(item.status) ? (
            <DueChip value={item.expected_delivery_date} />
          ) : (
            <Text className="text-sm" style={{ color: colors.textMuted }}>
              {formatDate(item.created_at)}
            </Text>
          )}
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
            hitSlop={8}
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
        {/* GET /orders/my-orders (the tailor's list) has no search parameter, so a search
            box there would do nothing. */}
        {!isTailorRole ? (
          <SearchBar
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setPage(1);
            }}
            placeholder={t('orders.searchPlaceholder')}
          />
        ) : null}

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

        {isTailorRole && !isLoading && !isError ? (
          <FilterChips
            className="mb-3"
            chips={[
              { key: 'all', label: t('orders.tabAll'), count: allOrders.length },
              ...TAILOR_BUCKETS.map((b) => ({ key: b.key, label: t(`orders.bucket.${b.key}`), count: bucketCounts[b.key] })),
            ]}
            value={bucket}
            onChange={setBucket}
          />
        ) : null}

        {isEmployeeRole && !isLoading && !isError ? (
          <FilterChips
            className="mb-3"
            chips={[
              { key: 'mine', label: t('orders.bridgeMine'), count: bridgeCounts.mine },
              { key: 'open', label: t('orders.bridgeOpen'), count: bridgeCounts.open },
              { key: 'all', label: t('orders.tabAll'), count: bridgeCounts.all },
            ]}
            value={bridgeView}
            onChange={setBridgeView}
          />
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
            // numColumns can't change on a mounted FlatList; remount on breakpoint change.
            key={`orders-${columns}`}
            data={orders}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
            keyExtractor={(item) => item.order_id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title={
                  isTailorRole && bucket !== 'all'
                    ? t('orders.bucketEmptyTitle', { tab: t(`orders.bucket.${bucket}`).toLowerCase() })
                    : t('orders.noOrdersFound')
                }
                description={isTailorRole && bucket !== 'all' ? t('orders.bucketEmptyHint') : t('orders.adjustFilters')}
              />
            }
            ListFooterComponent={
              totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null
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
