import { useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, Header, Pressable, ScreenContent, SkeletonList, StatCard } from '@/components/ui';
import { useDashboard, useExportDashboardCsvMutation } from '@/features/dashboard/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { normalizeDashboardResponse } from '@/utils/dashboard';
import { formatApiErrorDetail, formatCurrency } from '@/utils/errors';

// ─── Small presentational pieces (dependency-free, theme-driven) ──────────────

const SectionHeader = ({
  title,
  icon,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <Ionicons name={icon} size={17} color={colors.textSecondary} />
      <Text className="text-base font-bold ml-2" style={{ color: colors.text }}>
        {title}
      </Text>
    </View>
  );
};

// Horizontal proportion bar for a two-way split (e.g. Online vs COD revenue).
const SplitBar = ({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) => {
  const { colors } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <View>
      <View
        className="flex-row h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        {total > 0
          ? segments.map((seg) => (
              <View
                key={seg.label}
                style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
              />
            ))
          : null}
      </View>
      <View className="flex-row flex-wrap mt-3" style={{ gap: 16 }}>
        {segments.map((seg) => (
          <View key={seg.label} className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: seg.color }} />
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {seg.label}
            </Text>
            <Text className="text-sm font-semibold ml-1.5" style={{ color: colors.text }}>
              {formatCurrency(seg.value)}
            </Text>
            <Text className="text-xs ml-1" style={{ color: colors.textMuted }}>
              ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// A single labelled row in the order funnel with a proportional bar.
const FunnelRow = ({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) => {
  const { colors } = useTheme();
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
        <Text className="text-sm font-bold [font-variant-numeric:tabular-nums]" style={{ color: colors.text }}>
          {value}
        </Text>
      </View>
      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.surface }}>
        <View style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
};

// Full raw order-status distribution (mirrors web's ReportingComponents.jsx
// "Orders by Status" section) - deliberately separate from the Order Funnel
// above, which only groups the 6 lifecycle stages an ops person tracks day
// to day. This shows every status verbatim, including rare/stuck ones the
// funnel folds away (e.g. final_check, cloth_received_by_tailor).
const STATUS_DISTRIBUTION_COLORS: Record<string, string> = {
  order_accepted: '#3b82f6',
  pending_assignment: '#f59e0b',
  tailor_assigned: '#8b5cf6',
  pickup_scheduled: '#8b5cf6',
  picked_up: '#6366f1',
  cloth_received_by_tailor: '#6366f1',
  stitching_in_progress: '#0ea5e9',
  final_check: '#0ea5e9',
  ready_for_dispatch: '#3b82f6',
  out_for_delivery: '#3b82f6',
  delivered: '#16a34a',
  completed: '#16a34a',
  cancelled: '#ef4444',
  order_rejected: '#ef4444',
};

const StatusDistributionRow = ({
  status,
  count,
  pct,
  color,
}: {
  status: string;
  count: number;
  pct: number;
  color: string;
}) => {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center mb-2.5" style={{ gap: 10 }}>
      <Text
        className="text-xs font-semibold capitalize"
        style={{ color: colors.textSecondary, width: 128 }}
        numberOfLines={1}
      >
        {status.replace(/_/g, ' ')}
      </Text>
      <View className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.surface }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
      </View>
      <Text className="text-xs font-bold [font-variant-numeric:tabular-nums]" style={{ color: colors.text, width: 28, textAlign: 'right' }}>
        {count}
      </Text>
      <Text className="text-[11px] [font-variant-numeric:tabular-nums]" style={{ color: colors.textMuted, width: 32, textAlign: 'right' }}>
        {pct}%
      </Text>
    </View>
  );
};

const InfoRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row items-center justify-between py-2.5"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Text className="text-sm" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
      <Text className="text-sm font-semibold [font-variant-numeric:tabular-nums]" style={{ color: colors.text }}>
        {value}
      </Text>
    </View>
  );
};

export default function RevenueScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  const exportMutation = useExportDashboardCsvMutation();

  const dash = useMemo(() => normalizeDashboardResponse(data), [data]);

  const revenue = dash.revenue ?? {};
  const orders = dash.orders ?? {};
  const payments = dash.payments ?? {};
  const tailors = dash.tailors ?? {};

  const total = revenue.total ?? 0;
  const online = revenue.online ?? 0;
  const cod = revenue.cod ?? 0;

  // Average order value across successful payments (both derived from the same
  // dashboard payload, so they stay consistent).
  const successfulPayments = payments.successful ?? 0;
  const aov = successfulPayments > 0 ? total / successfulPayments : 0;

  // Order funnel — ordered lifecycle stages. Uses the dedicated aggregate
  // fields the backend already returns (no client-side status scan needed).
  const funnel = [
    { label: 'Total Orders', value: orders.total ?? 0, color: colors.primary },
    { label: 'Pending Assignment', value: orders.pending_assignment ?? 0, color: '#f59e0b' },
    { label: 'Pending Pickup', value: orders.pending_pickup ?? 0, color: '#8b5cf6' },
    { label: 'Out for Delivery', value: orders.out_for_delivery ?? 0, color: '#3b82f6' },
    { label: 'Delivered', value: orders.delivered ?? 0, color: '#16a34a' },
    { label: 'Cancelled', value: orders.cancelled ?? 0, color: colors.error },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const statusDistribution = useMemo(() => {
    const byStatus = orders.by_status ?? {};
    const totalCount = Math.max(1, Object.values(byStatus).reduce((s, v) => s + v, 0));
    return Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        pct: Math.round((count / totalCount) * 100),
        color: STATUS_DISTRIBUTION_COLORS[status] ?? colors.textMuted,
      }));
  }, [orders.by_status, colors.textMuted]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Revenue & Analytics"
        subtitle="Financial and operational overview"
        rightAction={
          <Pressable
            onPress={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: exportMutation.isPending ? 0.5 : 1 }}
          >
            <Ionicons
              name={exportMutation.isPending ? 'hourglass-outline' : 'download-outline'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="px-5">
          <SkeletonList count={5} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Failed to load analytics"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : (
        <ScreenContent
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* Revenue KPI grid */}
          <View className="flex-row flex-wrap mt-1" style={{ gap: 12 }}>
            <StatCard title="Total Revenue" value={formatCurrency(total)} icon="wallet-outline" color="#10b981" />
            <StatCard title="Today" value={formatCurrency(revenue.today)} icon="today-outline" color="#3b82f6" />
            <StatCard title="This Week" value={formatCurrency(revenue.this_week)} icon="calendar-outline" color="#8b5cf6" />
            <StatCard title="This Month" value={formatCurrency(revenue.this_month)} icon="trending-up-outline" color="#f59e0b" />
          </View>

          {/* Payment mix — online vs COD */}
          <Card className="mb-4">
            <SectionHeader title="Payment Mix" icon="pie-chart-outline" />
            <SplitBar
              segments={[
                { label: 'Online', value: online, color: colors.primary },
                { label: 'Cash on Delivery', value: cod, color: '#f59e0b' },
              ]}
            />
          </Card>

          {/* Key metrics */}
          <Card className="mb-4">
            <SectionHeader title="Key Metrics" icon="stats-chart-outline" />
            <InfoRow label="Successful Payments" value={String(successfulPayments)} />
            <InfoRow label="Average Order Value" value={formatCurrency(aov)} />
            <InfoRow label="Total Orders" value={String(orders.total ?? 0)} />
            <InfoRow
              label="Delivery Success Rate"
              value={`${
                (orders.total ?? 0) > 0
                  ? Math.round(((orders.delivered ?? 0) / (orders.total ?? 1)) * 100)
                  : 0
              }%`}
              last
            />
          </Card>

          {/* Order funnel */}
          <Card className="mb-4">
            <SectionHeader title="Order Funnel" icon="git-branch-outline" />
            {funnel.map((f) => (
              <FunnelRow key={f.label} label={f.label} value={f.value} max={funnelMax} color={f.color} />
            ))}
          </Card>

          {/* Orders by status — full raw distribution, not just the funnel's 6 stages */}
          {statusDistribution.length > 0 ? (
            <Card className="mb-4">
              <SectionHeader title="Orders by Status" icon="stats-chart-outline" />
              {statusDistribution.map((s) => (
                <StatusDistributionRow key={s.status} status={s.status} count={s.count} pct={s.pct} color={s.color} />
              ))}
            </Card>
          ) : null}

          {/* Tailor workforce */}
          <Card className="mb-8">
            <SectionHeader title="Tailor Workforce" icon="cut-outline" />
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-xl font-bold" style={{ color: colors.text }}>
                  {tailors.active ?? 0}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Active
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xl font-bold" style={{ color: colors.success }}>
                  {tailors.available ?? 0}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Available
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xl font-bold" style={{ color: colors.warning }}>
                  {tailors.busy ?? 0}
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Busy
                </Text>
              </View>
            </View>
          </Card>
        </ScreenContent>
      )}
    </View>
  );
}
