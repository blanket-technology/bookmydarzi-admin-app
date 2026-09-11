import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { Avatar, Badge, Card, ChartCard, EmptyState, Header, Pressable, ScreenContent, SkeletonList, StatCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ORDER_STATUS, ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useEmployeeOnlineStatus } from '@/features/pickups/hooks/usePickups';
import { useMyTailorProfile } from '@/features/tailors/hooks/useTailors';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useUsers } from '@/features/users/hooks/useUsers';
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
    <Pressable
      onPress={() => order.order_id && router.push(`/(drawer)/orders/${order.order_id}`)}
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: colors.border }}
    >
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
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
    </Pressable>
  );
};

// ─── Greeting hero for Tailor/Bridge — mirrors the Admin gradient hero
// below instead of a bare Header, so the very first screen these roles see
// feels finished rather than a plain stat grid with no identity/context.
const RoleDashboardHero = ({
  greeting,
  name,
  primaryStat,
  onlineBadge,
}: {
  greeting: string;
  name: string;
  primaryStat: { label: string; value: string | number };
  onlineBadge?: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
      <LinearGradient colors={[colors.drawer, colors.primary]} style={{ borderRadius: 20, padding: 20 }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-sm" style={{ color: colors.drawerText, opacity: 0.75 }}>
              {greeting}
            </Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.drawerText }} numberOfLines={1}>
              {name}
            </Text>
          </View>
          {onlineBadge}
        </View>
        <View className="bg-white/15 rounded-2xl px-4 py-3 mt-4 self-start">
          <Text className="text-xs" style={{ color: colors.drawerText, opacity: 0.7 }}>
            {primaryStat.label}
          </Text>
          <Text className="font-bold text-lg mt-1" style={{ color: colors.drawerText }}>
            {primaryStat.value}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// Compact online/offline pill for the hero - tailors read this straight
// from their own profile (real server state, refreshed by useAutoOnline /
// the manual toggle on the Broadcasts screen); employees have no
// fetchable "my status" endpoint (only the PATCH mutation returns it), so
// their hero shows a "Go online" CTA into Pickups/Deliveries instead of a
// second, potentially-stale toggle duplicating state that screen owns.
const OnlineStatusPill = ({ isOnline }: { isOnline: boolean }) => {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row items-center px-2.5 py-1.5 rounded-full"
      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
    >
      <View
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: isOnline ? '#4ade80' : '#f87171' }}
      />
      <Text className="text-xs font-semibold" style={{ color: colors.drawerText }}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
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
  hero,
  sectionTitle,
}: {
  isLoading: boolean;
  isError: boolean;
  errorDetail: string;
  onRetry: () => void;
  refreshing: boolean;
  stats: { title: string; value: number | string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress?: () => void }[];
  footnote: string;
  hero?: React.ReactNode;
  sectionTitle?: string;
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
    <ScreenContent
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRetry} tintColor={colors.primary} />}
    >
      {hero}
      {sectionTitle ? (
        <Text className="text-base font-bold mb-3" style={{ color: colors.text }}>
          {sectionTitle}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap mt-1" style={{ gap: 12 }}>
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            onPress={stat.onPress}
          />
        ))}
      </View>
      <Text className="text-xs mt-3 mb-8" style={{ color: colors.textMuted }}>
        {footnote}
      </Text>
    </ScreenContent>
  );
};

const timeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Keyed by parseDashboardStats' exact `title` strings (utils/dashboard.ts).
// "Revenue" has no dedicated screen on mobile (no Reporting route yet) so
// it's intentionally omitted — that StatCard stays non-interactive.
const STAT_CARD_ROUTES: Partial<Record<string, string>> = {
  'Total Orders': '/(drawer)/orders',
  "Today's Orders": '/(drawer)/orders',
  'Pending Orders': '/(drawer)/orders',
  'Delivered Orders': '/(drawer)/orders',
  'Total Users': '/(drawer)/customers',
  'Active Tailors': '/(drawer)/tailors',
  'Total Employees': '/(drawer)/employees',
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

  // Real server-side online status for the hero pill - kept in sync by the
  // manual toggle on Broadcasts and by useAutoOnline (mounted in
  // AppProviders), both of which already invalidate this same query.
  // GET /tailors/me is TAILOR-only server-side - gate the fetch or every
  // other role gets a 403 the moment they open this screen.
  const { data: tailorProfile } = useMyTailorProfile(isTailorRole);
  // GET /employee/me/online - same live-status source the Pickups/Deliveries
  // manual toggle already updates, so this pill reflects real state instead
  // of a static "Go online" label that never changes.
  const { data: employeeOnlineStatus } = useEmployeeOnlineStatus(isEmployeeRole);

  // GET /admin/dashboard is ADMIN/SUPERADMIN only server-side (require_admin
  // in app/api/v1/endpoints/admin.py) — Employee/Tailor must never call it.
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard(isAdminRole);
  const apiErrorDetail = isError ? formatApiErrorDetail(error) : '';

  const dashboard = useMemo(() => normalizeDashboardResponse(data), [data]);

  // GET /admin/dashboard only ever returns aggregate counts (orders.pending,
  // orders.today etc) - never actual order or customer rows, so
  // dashboard.recent_orders / .pending_orders / .latest_customers from
  // normalizeDashboardResponse are always empty. Fetch real rows the same
  // way the Employee/Tailor branches below already do: GET /admin/orders
  // (admin/superadmin/employee) and GET /admin/users, both already
  // available and permitted for this role.
  const {
    data: adminOrdersData,
    isLoading: isAdminOrdersLoading,
  } = useOrders({ page: 1, limit: 50 }, isAdminRole);
  const { data: adminUsersData, isLoading: isAdminUsersLoading } = useUsers(
    { page: 1, limit: 5 },
    isAdminRole,
  );
  const adminOrders = adminOrdersData?.orders ?? [];
  // Mirrors the exact "pending" status set app/services/admin/dashboard_service.py
  // uses for orders.pending, so this list and that count stay consistent.
  const PENDING_ORDER_STATUSES = new Set<string>([
    ORDER_STATUS.ORDER_PLACED,
    ORDER_STATUS.ORDER_ACCEPTED,
    ORDER_STATUS.SEARCHING_TAILOR,
    ORDER_STATUS.BROADCASTED,
    ORDER_STATUS.TAILOR_ASSIGNED,
    ORDER_STATUS.PICKUP_SCHEDULED,
    ORDER_STATUS.PICKUP_PENDING,
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.CLOTH_RECEIVED_BY_TAILOR,
    ORDER_STATUS.STITCHING_STARTED,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.FINAL_CHECK,
    ORDER_STATUS.READY_FOR_DISPATCH,
    ORDER_STATUS.OUT_FOR_DELIVERY,
  ]);
  const livePendingOrders = useMemo(
    () => adminOrders.filter((o) => PENDING_ORDER_STATUSES.has(o.status)),
    [adminOrders],
  );

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

  const statCards = parseDashboardStats(dashboard, isSuperadmin);
  const revenueData = dashboard.revenue_chart ?? [];
  const pendingOrders = livePendingOrders;
  const recentOrders = adminOrders;
  const customers = adminUsersData?.users ?? [];
  const pendingCount = dashboard.orders?.pending;
  const activeTailorsCount = dashboard.tailors?.active;

  if (isEmployeeRole) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Dashboard" showMenu />
        <RoleStatGrid
          isLoading={isEmployeeOrdersLoading}
          isError={isEmployeeOrdersError}
          errorDetail={formatApiErrorDetail(employeeOrdersErrorRaw)}
          onRetry={() => refetchEmployeeOrders()}
          refreshing={isEmployeeOrdersRefetching}
          footnote={`Based on your ${employeeOrdersData?.orders.length ?? 0} most recent assigned orders. Open Orders for the full, filterable list.`}
          hero={
            <RoleDashboardHero
              greeting={timeOfDayGreeting()}
              name={firstName ?? 'there'}
              primaryStat={{ label: "Today's Tasks", value: employeeStats.todaysTasks }}
              onlineBadge={
                <Pressable onPress={() => router.push('/(drawer)/pickups')}>
                  <OnlineStatusPill isOnline={Boolean(employeeOnlineStatus?.is_online)} />
                </Pressable>
              }
            />
          }
          sectionTitle="Your Queue"
          stats={[
            // Mirrors Admin_Web EmployeeDashboard.jsx: same 5 cards, each
            // deep-linking to a PRE-FILTERED order list (via ?status=) so no two
            // cards land on the same view. "Assigned"/"Today's Tasks" have no
            // single canonical status, so they open the full Orders list.
            { title: 'Assigned Orders', value: employeeStats.assigned, icon: 'receipt-outline', color: '#f59e0b', onPress: () => router.push('/(drawer)/orders') },
            { title: 'Pickup Queue', value: employeeStats.pickupQueue, icon: 'cube-outline', color: '#0ea5e9', onPress: () => router.push({ pathname: '/(drawer)/orders', params: { status: 'pickup_pending' } }) },
            { title: 'Delivery Queue', value: employeeStats.deliveryQueue, icon: 'bicycle-outline', color: '#3b82f6', onPress: () => router.push({ pathname: '/(drawer)/orders', params: { status: 'out_for_delivery' } }) },
            { title: 'COD Pending', value: employeeStats.codPending, icon: 'cash-outline', color: '#ef4444', onPress: () => router.push({ pathname: '/(drawer)/orders', params: { status: 'out_for_delivery' } }) },
          ]}
        />
      </View>
    );
  }

  if (isTailorRole) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Dashboard" showMenu />
        <RoleStatGrid
          isLoading={isTailorOrdersLoading}
          isError={isTailorOrdersError}
          errorDetail={formatApiErrorDetail(tailorOrdersErrorRaw)}
          onRetry={() => refetchTailorOrders()}
          refreshing={isTailorOrdersRefetching}
          footnote={`Based on your ${tailorOrdersData?.orders.length ?? 0} most recent orders. Open Orders for the full, filterable list.`}
          hero={
            <RoleDashboardHero
              greeting={timeOfDayGreeting()}
              name={firstName ?? 'there'}
              primaryStat={{ label: 'Earnings (completed)', value: formatCurrency(tailorStats.completedEarnings) }}
              onlineBadge={<OnlineStatusPill isOnline={Boolean(tailorProfile?.IsOnline)} />}
            />
          }
          sectionTitle="Your Work"
          stats={[
            { title: 'Assigned', value: tailorStats.assigned, icon: 'cube-outline', color: '#8b5cf6', onPress: () => router.push('/(drawer)/orders') },
            { title: 'Stitching', value: tailorStats.stitching, icon: 'cut-outline', color: '#f97316', onPress: () => router.push('/(drawer)/orders') },
            { title: 'Ready', value: tailorStats.ready, icon: 'checkmark-done-outline', color: '#6366f1', onPress: () => router.push('/(drawer)/orders') },
            { title: 'Completed', value: tailorStats.completed, icon: 'ribbon-outline', color: '#22c55e', onPress: () => router.push('/(drawer)/orders') },
          ]}
        />
      </View>
    );
  }

  if (!isAdminRole) {
    // Any role other than employee/tailor/admin/superadmin falls through
    // here - render an explicit unsupported-role state instead of silently
    // showing an all-zero admin dashboard (useDashboard/useOrders above are
    // gated on isAdminRole, so they never even fetch for this case).
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Dashboard" subtitle={`Welcome back, ${firstName ?? 'there'}`} />
        <EmptyState
          title="Dashboard unavailable"
          description={`No dashboard view is configured for the "${normalizedRole || 'unknown'}" role. Contact an administrator if this seems wrong.`}
        />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Dashboard" />

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
        <ScreenContent
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <LinearGradient
              colors={[colors.drawer, colors.primary]}
              style={{ borderRadius: 20, padding: 20, marginBottom: 10 }}
            >
              <Text className="text-sm" style={{ color: colors.drawerText, opacity: 0.75 }}>
                {dashboard.welcome?.greeting ?? "Here's your business at a glance"}
              </Text>
              <Text className="text-2xl font-bold mt-1" style={{ color: colors.drawerText }}>
                {dashboard.welcome?.admin_name ?? user?.full_name ?? 'Admin'}
              </Text>
              <View className="flex-row mt-4 gap-3">
                <Pressable
                  onPress={() => router.push('/(drawer)/orders')}
                  className="bg-white/15 rounded-2xl px-4 py-3 flex-1"
                >
                  <Text className="text-xs" style={{ color: colors.drawerText, opacity: 0.7 }}>
                    Needs Attention
                  </Text>
                  <Text className="font-bold text-lg mt-1" style={{ color: colors.drawerText }}>
                    {formatDashboardCount(pendingCount, 'orders')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(drawer)/tailors')}
                  className="bg-white/15 rounded-2xl px-4 py-3 flex-1"
                >
                  <Text className="text-xs" style={{ color: colors.drawerText, opacity: 0.8 }}>
                    Active Tailors
                  </Text>
                  <Text className="font-bold text-lg mt-1" style={{ color: colors.drawerText, opacity: 0.9 }}>
                    {formatDashboardCount(activeTailorsCount)}
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: 10, marginBottom: 5 }}>
            {statCards.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                onPress={STAT_CARD_ROUTES[stat.title] ? () => router.push(STAT_CARD_ROUTES[stat.title] as never) : undefined}
              />
            ))}
          </View>

          {isSuperadmin && <ChartCard title="Revenue Overview" data={revenueData} />}

          <Card className="mb-4">
            <SectionHeader
              title="Pending Orders"
              icon="time-outline"
              accessory={
                <Pressable
                  onPress={() => router.push('/(drawer)/orders')}
                  className="flex-row items-center"
                >
                  {(pendingCount ?? pendingOrders.length) > 0 ? (
                    // pendingOrders is derived from the first 50 most-recent
                    // orders (no aggregation endpoint - see the fetch above),
                    // so it can under-count vs. the server's true aggregate
                    // once pending orders exceed that page. Prefer the
                    // authoritative server count whenever it's at least as
                    // large.
                    <Badge
                      label={String(Math.max(pendingCount ?? 0, pendingOrders.length))}
                      backgroundColor={colors.primaryLight}
                      color={colors.primary}
                    />
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                </Pressable>
              }
            />
            {isAdminOrdersLoading ? (
              <SkeletonList count={3} />
            ) : pendingOrders.length > 0 ? (
              pendingOrders.slice(0, 5).map((order) => <OrderRow key={order.order_id} order={order} />)
            ) : (
              <InlineEmpty label="No pending orders" />
            )}
          </Card>

          <Card className="mb-4">
            <SectionHeader
              title="Recent Orders"
              icon="receipt-outline"
              accessory={
                <Pressable onPress={() => router.push('/(drawer)/orders')}>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              }
            />
            {isAdminOrdersLoading ? (
              <SkeletonList count={3} />
            ) : recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => <OrderRow key={order.order_id} order={order} />)
            ) : (
              <InlineEmpty label="No recent orders" />
            )}
          </Card>

          <Card className="mb-4">
            <SectionHeader
              title="Latest Customers"
              icon="people-outline"
              accessory={
                <Pressable onPress={() => router.push('/(drawer)/customers')}>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              }
            />
            {isAdminUsersLoading ? (
              <SkeletonList count={3} />
            ) : customers.length > 0 ? (
              customers.slice(0, 5).map((customer) => (
                <Pressable
                  key={customer.id ?? customer.email}
                  onPress={() => customer.id && router.push(`/(drawer)/customers/${customer.id}`)}
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
                </Pressable>
              ))
            ) : (
              <InlineEmpty label="No customers yet" />
            )}
          </Card>

          <Pressable onPress={() => router.push('/(drawer)/tailors')}>
            <Card className="mb-8">
              <SectionHeader
                title="Tailor Workforce"
                icon="cut-outline"
                accessory={<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
              />
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
          </Pressable>
        </ScreenContent>
      )}
    </View>
  );
}
