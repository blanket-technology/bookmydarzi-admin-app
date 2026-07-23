import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  Avatar,
  Badge,
  Card,
  ChartCard,
  EmptyState,
  Header,
  SkeletonList,
  StatCard,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useOrders } from '@/features/orders/hooks/useOrders';
import {
  formatDashboardCount,
  normalizeDashboardResponse,
  parseDashboardStats,
} from '@/utils/dashboard';
import { computeEmployeeDashboardStats, computeTailorDashboardStats } from '@/utils/employeeDashboard';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const SectionHeader = ({
  title,
  icon,
  accessory,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessory?: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={17} color={colors.textSecondary} />
        <Text className="text-base font-bold ml-2" style={{ color: colors.text }}>
          {title}
        </Text>
      </View>
      {accessory}
    </View>
  );
};

const InlineEmpty = ({ label }: { label: string }) => {
  const { colors } = useTheme();
  return (
    <Text className="text-sm py-6 text-center" style={{ color: colors.textMuted }}>
      {label}
    </Text>
  );
};

const OrderRow = ({
  order,
}: {
  order: {
    order_id?: string;
    order_code?: string;
    customer_name?: string;
    service_name?: string;
    status?: string;
    amount?: number;
    final_amount?: number;
    created_at?: string;
  };
}) => {
  const { colors } = useTheme();
  const status = order.status ?? 'pending_payment';
  const statusColor = ORDER_STATUS_COLORS[status] ?? colors.primary;

  return (
    <View className="flex-row items-center py-3 border-b" style={{ borderColor: colors.border }}>
      <View
        className="w-1.5 h-10 rounded-full mr-3"
        style={{ backgroundColor: statusColor }}
      />
      <View className="flex-1">
        <Text className="font-semibold" style={{ color: colors.text }}>
          {order.order_code ?? order.order_id}
        </Text>
        <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
          {order.customer_name ?? 'Customer'} · {order.service_name ?? 'Service'}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          {formatCurrency(order.final_amount ?? order.amount)}
        </Text>
        <Badge
          label={orderStatusLabel(status)}
          backgroundColor={`${statusColor}18`}
          color={statusColor}
        />
      </View>
    </View>
  );
};

const RoleStatGrid = ({
  isLoading,
  isError,
  errorDetail,
  onRetry,
  refreshing,
  stats,
  footnote,
}: {
  isLoading: boolean;
  isError: boolean;
  errorDetail: string;
  onRetry: () => void;
  refreshing: boolean;
  stats: { title: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }[];
  footnote: string;
}) => {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View className="px-5">
        <SkeletonList count={4} />
      </View>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Unable to load dashboard"
        description={errorDetail}
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }
  return (
    <ScrollView
      className="px-5"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRetry} tintColor={colors.primary} />}
    >
      <View className="flex-row flex-wrap mt-1" style={{ gap: 12 }}>
        {stats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </View>
      <Text className="text-xs mt-1 mb-8" style={{ color: colors.textMuted }}>
        {footnote}
      </Text>
    </ScrollView>
  );
};

export default function DashboardScreen() {
  const { user, selectedRole } = useAuth();
  const { colors } = useTheme();
  const normalizedRole = String(user?.role ?? selectedRole ?? '').toLowerCase();
  const isSuperadmin = normalizedRole === 'superadmin';
  const isAdminRole = normalizedRole === 'admin' || isSuperadmin;
  const isEmployeeRole = normalizedRole === 'employee';
  const isTailorRole = normalizedRole === 'tailor';
  const firstName = user?.full_name?.split(' ')[0];

  // GET /admin/dashboard is ADMIN/SUPERADMIN only server-side (require_admin
  // in app/api/v1/endpoints/admin.py) — Employee/Tailor must never call it.
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard(isAdminRole);
  const apiErrorDetail = isError ? formatApiErrorDetail(error) : '';

  const dashboard = useMemo(() => normalizeDashboardResponse(data), [data]);

  // Employees can call GET /admin/orders (require_roles includes EMPLOYEE),
  // so their dashboard widgets are derived client-side from that list — the
  // backend has no employee-specific aggregation endpoint. Limited to the
  // first page (50 most recent orders — the backend's hard cap on `limit`,
  // see GET /orders/my-orders's `Query(10, ge=1, le=50)`) to avoid an
  // unbounded fetch; see computeEmployeeDashboardStats for the caveat.
  const {
    data: employeeOrdersData,
    isLoading: isEmployeeOrdersLoading,
    isError: isEmployeeOrdersError,
    error: employeeOrdersErrorRaw,
    refetch: refetchEmployeeOrders,
    isRefetching: isEmployeeOrdersRefetching,
  } = useOrders({ page: 1, limit: 50 }, isEmployeeRole);
  const employeeStats = useMemo(
    () => computeEmployeeDashboardStats(employeeOrdersData?.orders ?? []),
    [employeeOrdersData],
  );

  // Tailors can call GET /orders/my-orders (normalized to the same
  // AdminOrderItem shape by orderService.getMyOrders / useOrders) — the
  // backend has no tailor-specific dashboard aggregation endpoint. Capped
  // at 50 to match the endpoint's `Query(10, ge=1, le=50)` — a higher
  // limit is rejected with a 422, which previously broke this screen.
  const {
    data: tailorOrdersData,
    isLoading: isTailorOrdersLoading,
    isError: isTailorOrdersError,
    error: tailorOrdersErrorRaw,
    refetch: refetchTailorOrders,
    isRefetching: isTailorOrdersRefetching,
  } = useOrders({ page: 1, limit: 50 }, isTailorRole);
  const tailorStats = useMemo(
    () => computeTailorDashboardStats(tailorOrdersData?.orders ?? []),
    [tailorOrdersData],
  );

  useEffect(() => {
    if (__DEV__) {
      console.log('[DashboardScreen] state', {
        isLoading,
        isError,
        error: apiErrorDetail,
        hasRawData: data != null,
        statistics: dashboard.statistics,
      });
    }
  }, [apiErrorDetail, dashboard.statistics, data, isError, isLoading]);

  const statCards = parseDashboardStats(dashboard, isSuperadmin);
  const revenueData = dashboard.revenue_chart ?? [];
  const pendingOrders = dashboard.pending_orders ?? [];
  const recentOrders = dashboard.recent_orders ?? [];
  const assignments = dashboard.priority_assignments ?? [];
  const customers = dashboard.latest_customers ?? [];
  const pendingCount = dashboard.orders?.pending;
  const activeTailorsCount = dashboard.tailors?.active;

  if (isEmployeeRole) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Dashboard" subtitle={`Welcome back, ${firstName ?? 'there'}`} />
        <RoleStatGrid
          isLoading={isEmployeeOrdersLoading}
          isError={isEmployeeOrdersError}
          errorDetail={formatApiErrorDetail(employeeOrdersErrorRaw)}
          onRetry={() => refetchEmployeeOrders()}
          refreshing={isEmployeeOrdersRefetching}
          footnote={`Based on your ${employeeOrdersData?.orders.length ?? 0} most recent orders. Open Orders for the full, filterable list.`}
          stats={[
            { title: 'Assigned Today', value: employeeStats.assignedToday, icon: 'receipt-outline', color: '#8b5cf6' },
            { title: "Today's Pickups", value: employeeStats.pickupToday, icon: 'cube-outline', color: '#f59e0b' },
            { title: "Today's Deliveries", value: employeeStats.deliveryToday, icon: 'bicycle-outline', color: '#3b82f6' },
            { title: 'COD Pending', value: employeeStats.codPending, icon: 'cash-outline', color: '#ef4444' },
          ]}
        />
      </View>
    );
  }

  if (isTailorRole) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Dashboard" subtitle={`Welcome back, ${firstName ?? 'there'}`} />
        <RoleStatGrid
          isLoading={isTailorOrdersLoading}
          isError={isTailorOrdersError}
          errorDetail={formatApiErrorDetail(tailorOrdersErrorRaw)}
          onRetry={() => refetchTailorOrders()}
          refreshing={isTailorOrdersRefetching}
          footnote={`Based on your ${tailorOrdersData?.orders.length ?? 0} most recent orders. Open Orders for the full, filterable list.`}
          stats={[
            { title: 'Assigned', value: tailorStats.assigned, icon: 'cube-outline', color: '#8b5cf6' },
            { title: 'Stitching', value: tailorStats.stitching, icon: 'cut-outline', color: '#0ea5e9' },
            { title: 'Ready', value: tailorStats.ready, icon: 'checkmark-done-outline', color: '#14b8a6' },
            { title: 'Completed', value: tailorStats.completed, icon: 'ribbon-outline', color: '#22c55e' },
          ]}
        />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Dashboard" subtitle={`Welcome back, ${firstName ?? 'Admin'}`} />

      {isLoading ? (
        <View className="px-5">
          <SkeletonList count={6} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Unable to load dashboard"
          description={apiErrorDetail}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : (
        <ScrollView
          className="px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          <LinearGradient
            colors={[colors.drawer, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-5 mb-5 mt-1"
          >
            <Text className="text-sm" style={{ color: colors.drawerText, opacity: 0.75 }}>
              {dashboard.welcome?.greeting ?? "Here's your business at a glance"}
            </Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.drawerText }}>
              {dashboard.welcome?.admin_name ?? user?.full_name ?? 'Admin'}
            </Text>
            <View className="flex-row mt-4 gap-3">
              <View className="bg-white/15 rounded-2xl px-4 py-3 flex-1">
                <Text className="text-xs" style={{ color: colors.drawerText, opacity: 0.7 }}>
                  Needs Attention
                </Text>
                <Text className="font-bold text-lg mt-1" style={{ color: colors.drawerText }}>
                  {formatDashboardCount(pendingCount, 'orders')}
                </Text>
              </View>
              <View className="bg-white/15 rounded-2xl px-4 py-3 flex-1">
                <Text className="text-xs" style={{ color: colors.drawerText, opacity: 0.7 }}>
                  Active Tailors
                </Text>
                <Text className="font-bold text-lg mt-1" style={{ color: colors.drawerText }}>
                  {formatDashboardCount(activeTailorsCount)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {statCards.map((stat) => (
              <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
            ))}
          </View>

          {isSuperadmin && <ChartCard title="Revenue Overview" data={revenueData} />}

          <Card className="mb-4">
            <SectionHeader
              title="Pending Orders"
              icon="time-outline"
              accessory={pendingOrders.length > 0 ? <Badge label={String(pendingOrders.length)} backgroundColor={colors.primaryLight} color={colors.primary} /> : undefined}
            />
            {pendingOrders.length > 0 ? (
              pendingOrders.slice(0, 5).map((order) => <OrderRow key={order.order_id} order={order} />)
            ) : (
              <InlineEmpty label="No pending orders" />
            )}
          </Card>

          <Card className="mb-4">
            <SectionHeader title="Recent Orders" icon="receipt-outline" />
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => <OrderRow key={order.order_id} order={order} />)
            ) : (
              <InlineEmpty label="No recent orders" />
            )}
          </Card>

          <Card className="mb-4">
            <SectionHeader title="Priority Assignments" icon="flash-outline" />
            {assignments.length > 0 ? (
              assignments.slice(0, 5).map((item) => (
                <View
                  key={item.order_id}
                  className="flex-row items-center py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-1">
                    <Text className="font-semibold" style={{ color: colors.text }}>
                      {item.order_code ?? item.order_id}
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {item.tailor_name ?? 'Unassigned'} · {item.customer_name}
                    </Text>
                  </View>
                  <Badge label={item.priority ?? 'High'} backgroundColor="#fef3c7" color="#d97706" />
                </View>
              ))
            ) : (
              <InlineEmpty label="No priority assignments" />
            )}
          </Card>

          <Card className="mb-4">
            <SectionHeader title="Latest Customers" icon="people-outline" />
            {customers.length > 0 ? (
              customers.slice(0, 5).map((customer) => (
                <View
                  key={customer.id ?? customer.user_id ?? customer.email}
                  className="flex-row items-center py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <Avatar name={customer.full_name} size={40} />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold" style={{ color: colors.text }}>
                      {customer.full_name ?? 'Customer'}
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {customer.email ?? customer.mobile}
                    </Text>
                  </View>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {formatDate(customer.created_at)}
                  </Text>
                </View>
              ))
            ) : (
              <InlineEmpty label="No customers yet" />
            )}
          </Card>

          <Card className="mb-8">
            <SectionHeader title="Tailor Workforce" icon="cut-outline" />
            {dashboard.tailors ? (
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>
                    {formatDashboardCount(dashboard.tailors.active)}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Active
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold" style={{ color: colors.success }}>
                    {formatDashboardCount(dashboard.tailors.available)}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Available
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold" style={{ color: colors.warning }}>
                    {formatDashboardCount(dashboard.tailors.busy)}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Busy
                  </Text>
                </View>
              </View>
            ) : (
              <InlineEmpty label="Tailor workforce data unavailable" />
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
