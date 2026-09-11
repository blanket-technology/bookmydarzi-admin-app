import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { ORDER_PAYMENT_STATUS_OPTIONS, PAYMENT_STATUS_COLORS, paymentStatusLabel } from '@/constants/paymentStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { PaymentDetailsSheet } from '@/features/orders/components/PaymentDetailsSheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminOrderItem } from '@/types/orders';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 15;

// Bucket an order's settlement status into the four states ops scans for.
// Computed from the loaded page (no extra request, no revenue figures), a
// quick health strip like fintech ops dashboards. Mirrors Admin_Web.
type Bucket = 'paid' | 'pending' | 'failed' | 'cod';
function bucketOf(order: AdminOrderItem): Bucket {
  const s = (order.payment_status ?? '').toLowerCase();
  if (s === 'fully_paid' || s === 'advance_paid') return 'paid';
  if (s === 'advance_failed') return 'failed';
  if (s === 'cod_pending') return 'cod';
  return 'pending';
}

function KpiChip({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-1 rounded-2xl px-3 py-2.5 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-center" style={{ gap: 5 }}>
        <Ionicons name={icon} size={13} color={color} />
        <Text className="text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>
          {label}
        </Text>
      </View>
      <Text className="text-lg font-bold mt-0.5 [font-variant-numeric:tabular-nums]" style={{ color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

// There is no standalone "list all payments" endpoint on the backend — web's
// PaymentsPage.jsx composes this same view client-side from GET /admin/orders
// filtered by payment_status (each order IS effectively one payment row).
// Mirrors that pattern exactly rather than inventing a new backend endpoint.
export default function PaymentsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isSuperadmin = normalizedRole === 'superadmin';
  const isAdminRole = isSuperadmin || normalizedRole === 'admin';
  const isStaffRole = isAdminRole || normalizedRole === 'employee';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  // Opens PaymentDetailsSheet directly from the list — previously the only
  // way to reach refund/status-override was list row -> order detail ->
  // Payment Details sub-sheet, an extra hop for a screen whose whole purpose
  // is payments. Same sheet/mutations as orders/[id].tsx, just triggered here.
  const [paymentSheetOrderId, setPaymentSheetOrderId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search || undefined,
      payment_status: statusFilter || undefined,
    }),
    [page, search, statusFilter],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useOrders(params);

  const orders = data?.orders ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const counts = useMemo(
    () =>
      orders.reduce(
        (acc, o) => {
          acc[bucketOf(o)] += 1;
          return acc;
        },
        { paid: 0, pending: 0, failed: 0, cod: 0 } as Record<Bucket, number>,
      ),
    [orders],
  );

  const renderItem = ({ item }: { item: AdminOrderItem }) => {
    const statusColor = PAYMENT_STATUS_COLORS[item.payment_status ?? ''] ?? colors.primary;
    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/orders/${item.order_id}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {item.order_code ?? item.order_id}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.customer_name ?? 'Customer'}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {formatCurrency(item.final_amount ?? item.amount)}
            </Text>
            <Badge
              label={paymentStatusLabel(item.payment_status)}
              backgroundColor={`${statusColor}20`}
              color={statusColor}
            />
          </View>
        </View>
        {typeof item.remaining_amount === 'number' && item.remaining_amount > 0 ? (
          <Text className="text-xs mt-2" style={{ color: colors.error }}>
            Balance due: {formatCurrency(item.remaining_amount)}
          </Text>
        ) : null}
        {isStaffRole ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setPaymentSheetOrderId(item.order_id);
            }}
            className="flex-row items-center justify-center mt-3 pt-3 border-t"
            style={{ borderColor: colors.border, gap: 6 }}
          >
            <Ionicons name="wallet-outline" size={14} color={colors.primary} />
            <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
              View payment details
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Payments" subtitle={`${data?.total ?? orders.length} payments`} />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {/* At-a-glance health strip for the current page (no revenue figures,
            so it's safe for every role). Mirrors Admin_Web PaymentsPage. */}
        {!isLoading && orders.length > 0 ? (
          <View className="flex-row mb-3" style={{ gap: 8 }}>
            <KpiChip icon="checkmark-circle-outline" label="Paid" value={counts.paid} color="#16a34a" />
            <KpiChip icon="time-outline" label="Pending" value={counts.pending} color="#f59e0b" />
            <KpiChip icon="close-circle-outline" label="Failed" value={counts.failed} color="#ef4444" />
            <KpiChip icon="cash-outline" label="COD" value={counts.cod} color="#3b82f6" />
          </View>
        ) : null}
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search order code, customer, mobile..."
        />
        <View className="flex-row flex-wrap gap-2 mb-3">
          {ORDER_PAYMENT_STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className="px-3.5 py-1.5 rounded-full border"
              style={{
                backgroundColor: statusFilter === opt.value ? colors.primary : colors.surface,
                borderColor: statusFilter === opt.value ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: statusFilter === opt.value ? '#fff' : colors.text }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load payments"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.order_id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={<EmptyState icon="wallet-outline" title="No payments found" />}
            ListFooterComponent={
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            }
          />
        )}
      </View>

      {paymentSheetOrderId ? (
        <PaymentDetailsSheet
          visible
          onClose={() => setPaymentSheetOrderId(null)}
          orderId={paymentSheetOrderId}
          isAdminRole={isAdminRole}
          isSuperadmin={isSuperadmin}
          isStaffRole={isStaffRole}
        />
      ) : null}
    </View>
  );
}
