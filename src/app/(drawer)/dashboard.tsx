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
import { ORDER_STATUS_COLORS } from '@/constants/orderStatus';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import {
  formatDashboardCount,
  normalizeDashboardResponse,
  parseDashboardStats,
} from '@/utils/dashboard';
import { capitalize, formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

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
  const status = order.status ?? 'pending';
  const statusColor = ORDER_STATUS_COLORS[status] ?? colors.primary;

  return (
    <View
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-1">
        <Text className="font-semibold" style={{ color: colors.text }}>
          {order.order_code ?? order.order_id}
        </Text>
        <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
          {order.customer_name ?? 'Customer'} · {order.service_name ?? 'Service'}
        </Text>
      </View>
      <View className="items-end">
        <Badge
          label={capitalize(status)}
          backgroundColor={`${statusColor}20`}
          color={statusColor}
        />
        <Text className="text-sm font-semibold mt-1" style={{ color: colors.text }}>
          {formatCurrency(order.final_amount ?? order.amount)}
        </Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  const apiErrorDetail = formatApiErrorDetail(error);

  const dashboard = useMemo(() => normalizeDashboardResponse(data), [data]);

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

  const statCards = parseDashboardStats(dashboard);
  const revenueData = dashboard.revenue_chart ?? [];
  const pendingOrders = dashboard.pending_orders ?? [];
  const recentOrders = dashboard.recent_orders ?? [];
  const assignments = dashboard.priority_assignments ?? [];
  const customers = dashboard.latest_customers ?? [];
  const tailors = dashboard.active_tailors_list ?? dashboard.active_tailors ?? [];
  const pendingCount = dashboard.orders?.pending;
  const activeTailorsCount =
    Array.isArray(tailors) && tailors.length > 0 ? tailors.length : undefined;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${user?.full_name?.split(' ')[0] ?? 'Admin'}`}
      />

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
            colors={['#4c1d95', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-5 mb-5"
          >
            <Text className="text-violet-200 text-sm">Welcome back</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {dashboard.welcome?.admin_name ?? user?.full_name ?? 'Admin'}
            </Text>
            <Text className="text-violet-100 mt-2 leading-5">
              {dashboard.welcome?.greeting ??
                'Here is what is happening with your tailoring business today.'}
            </Text>
            <View className="flex-row mt-4 gap-3">
              <View className="bg-white/15 rounded-2xl px-4 py-3 flex-1">
                <Text className="text-violet-200 text-xs">Today&apos;s Focus</Text>
                <Text className="text-white font-bold text-lg mt-1">
                  {formatDashboardCount(pendingCount, 'Pending')}
                </Text>
              </View>
              <View className="bg-white/15 rounded-2xl px-4 py-3 flex-1">
                <Text className="text-violet-200 text-xs">Active Tailors</Text>
                <Text className="text-white font-bold text-lg mt-1">
                  {formatDashboardCount(activeTailorsCount)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className="flex-row flex-wrap justify-between">
            {statCards.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </View>

          <ChartCard title="Revenue Overview" data={revenueData} />

          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                Pending Orders
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
            </View>
            {pendingOrders.length > 0 ? (
              pendingOrders.slice(0, 5).map((order) => (
                <OrderRow key={order.order_id} order={order} />
              ))
            ) : (
              <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
                No pending orders
              </Text>
            )}
          </Card>

          <Card className="mb-4">
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
              Recent Orders
            </Text>
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => (
                <OrderRow key={order.order_id} order={order} />
              ))
            ) : (
              <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
                No recent orders
              </Text>
            )}
          </Card>

          <Card className="mb-4">
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
              Priority Assignments
            </Text>
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
                  <Badge
                    label={item.priority ?? 'High'}
                    backgroundColor="#fef3c7"
                    color="#d97706"
                  />
                </View>
              ))
            ) : (
              <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
                No priority assignments
              </Text>
            )}
          </Card>

          <Card className="mb-4">
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
              Latest Customers
            </Text>
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
              <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
                No customers yet
              </Text>
            )}
          </Card>

          <Card className="mb-8">
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
              Active Tailors
            </Text>
            {Array.isArray(tailors) && tailors.length > 0 ? (
              tailors.slice(0, 5).map((tailor) => (
                <View
                  key={tailor.tailor_id}
                  className="flex-row items-center py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <Avatar name={tailor.full_name} size={40} />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold" style={{ color: colors.text }}>
                      {tailor.full_name ?? 'Tailor'}
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {tailor.specialization ?? 'General Tailoring'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={14} color="#fbbf24" />
                      <Text className="text-sm font-semibold ml-1" style={{ color: colors.text }}>
                        {tailor.rating?.toFixed(1) ?? '—'}
                      </Text>
                    </View>
                    <Text className="text-xs mt-1" style={{ color: colors.success }}>
                      {tailor.is_available ? 'Available' : 'Busy'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
                No active tailors
              </Text>
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
