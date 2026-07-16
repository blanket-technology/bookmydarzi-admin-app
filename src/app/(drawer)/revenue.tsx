import { ScrollView, Text, View } from 'react-native';
import { Card, ChartCard, EmptyState, Header, SkeletonList, StatCard } from '@/components/ui';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { formatApiErrorDetail, formatCurrency } from '@/utils/errors';

export default function RevenueScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useDashboard();

  const stats = (data?.statistics ?? data?.stats ?? data) as Record<string, unknown>;
  const revenueData = data?.revenue_chart ?? [];
  const totalOrders = Number(stats.total_orders ?? 0);
  const completedOrders = Number(stats.completed_orders ?? 0);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Revenue" subtitle="Financial overview" />
      {isLoading ? (
        <View className="px-5">
          <SkeletonList count={4} />
        </View>
      ) : isError ? (
        <EmptyState
          title="Failed to load revenue"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : (
        <ScrollView className="px-5">
          <View className="flex-row flex-wrap justify-between">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(Number(stats?.total_revenue ?? 0))}
              icon="wallet-outline"
              color="#10b981"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(Number(stats?.monthly_revenue ?? 0))}
              icon="trending-up-outline"
              color="#8b5cf6"
            />
          </View>
          <ChartCard title="Revenue Trend" data={revenueData} />
          <Card className="mb-8">
            <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
              Summary
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Total orders: {totalOrders}
            </Text>
            <Text className="mt-1" style={{ color: colors.textSecondary }}>
              Completed orders: {completedOrders}
            </Text>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
