import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Loader, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { useMyPayoutSummary, useMyPayouts } from '@/features/tailors/hooks/useTailors';
import { useMyBridgePayoutSummary, useMyBridgePayouts } from '@/features/staff/hooks/useBridgeProfile';
import { LEG_TYPE_LABELS } from '@/features/payouts/legTypeLabels';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { Payout } from '@/types/payouts';
import type { BridgePayout } from '@/types/bridgePayouts';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const LIMIT = 20;

type AnyPayout = Payout | BridgePayout;

function isBridgePayout(p: AnyPayout): p is BridgePayout {
  return 'leg_type' in p;
}

function payoutAmount(p: AnyPayout): number {
  return Number(isBridgePayout(p) ? p.rate_amount : p.payout_amount);
}

function payoutSubtitle(p: AnyPayout): string {
  return isBridgePayout(p) ? LEG_TYPE_LABELS[p.leg_type] : `${Number(p.commission_percent).toFixed(2)}% commission`;
}

// Real "My Earnings" screen for Tailor and Bridge - replaces the old
// EarningsSummaryCard's derived "sum of my completed orders"
// approximation with the actual payout ledger (TailorPayout for tailors,
// BridgePayout for Bridge/employee), via each role's own self-service
// endpoint. Same screen component for both roles since the list/summary
// shape and the UI are otherwise identical - only the data source and a
// couple of label differences (leg vs commission %) vary.
export default function MyEarningsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const isTailor = role === 'tailor';
  const isBridge = role === 'employee';

  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'paid'>('');
  const [page, setPage] = useState(1);

  const tailorQuery = useMyPayouts({ page, limit: LIMIT, status: statusFilter || undefined }, isTailor);
  const bridgeQuery = useMyBridgePayouts({ page, limit: LIMIT, status: statusFilter || undefined }, isBridge);
  const tailorSummary = useMyPayoutSummary(isTailor);
  const bridgeSummary = useMyBridgePayoutSummary(isBridge);

  const { data, isLoading, isError, error, refetch, isRefetching } = isTailor ? tailorQuery : bridgeQuery;
  const summary = isTailor ? tailorSummary.data : bridgeSummary.data;
  const summaryLoading = isTailor ? tailorSummary.isLoading : bridgeSummary.isLoading;

  const payouts: AnyPayout[] = data?.payouts ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const renderItem = ({ item }: { item: AnyPayout }) => (
    <View className="rounded-3xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.order_code ?? `#${item.order_id}`}
          </Text>
          <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {formatCurrency(payoutAmount(item))}
          </Text>
          <Badge
            label={item.status}
            backgroundColor={item.status === 'paid' ? '#10b98120' : '#f59e0b20'}
            color={item.status === 'paid' ? '#10b981' : '#f59e0b'}
          />
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {payoutSubtitle(item)}
        </Text>
        {item.status === 'paid' && item.payout_reference ? (
          <Text className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
            {item.payout_reference}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="My Earnings" subtitle="Your real payout history" />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {summaryLoading ? (
          <View className="mb-4">
            <Loader />
          </View>
        ) : summary ? (
          <View className="flex-row mb-4" style={{ gap: 12 }}>
            <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: '#f59e0b20' }}>
              <Text className="text-xl font-bold" style={{ color: '#f59e0b' }}>
                {formatCurrency(Number(summary.pending_amount))}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                Pending ({summary.pending_count})
              </Text>
            </View>
            <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: '#10b98120' }}>
              <Text className="text-xl font-bold" style={{ color: '#10b981' }}>
                {formatCurrency(Number(summary.paid_amount))}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                Paid ({summary.paid_count})
              </Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2 mb-3">
          {[
            { value: '' as const, label: 'All' },
            { value: 'pending' as const, label: 'Pending' },
            { value: 'paid' as const, label: 'Paid' },
          ].map((opt) => (
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
            title="Failed to load earnings"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={payouts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="wallet-outline" title="No earnings yet" description="Completed orders will show up here once paid out." />
            }
            ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          />
        )}
      </View>
    </View>
  );
}
