import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, EmptyState, Header, Loader, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { useMyPayoutSummary, useMyPayouts } from '@/features/tailors/hooks/useTailors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { TailorSelfPayout } from '@/types/payouts';
import { formatApiErrorDetail, formatMoney, formatDate } from '@/utils/errors';

const LIMIT = 20;

function payoutAmount(p: TailorSelfPayout): number {
  return Number(p.payout_amount);
}

function payoutSubtitle(p: TailorSelfPayout): string {
  return `${Number(p.commission_percent).toFixed(2)}% commission`;
}

// Simple, honest placeholder for Bridge - no numbers, since the per-leg
// rates behind them are provisional defaults, not a confirmed
// compensation model. Same plain-language, one-screen-one-message
// convention as RequestCallbackScreen.tsx.
function BridgeEarningsComingSoon() {
  const { colors } = useTheme();
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="My Earnings" showMenu={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <Ionicons name="time-outline" size={44} color={colors.primary} />
        </View>
        <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
          Coming soon
        </Text>
        <Text className="text-sm text-center mt-2" style={{ color: colors.textSecondary }}>
          Your earnings page is being set up. Contact support if you have questions about your pay.
        </Text>
      </View>
    </View>
  );
}

// Real "My Earnings" screen for Tailor and Bridge - replaces the old
// EarningsSummaryCard's derived "sum of my completed orders"
// approximation with the actual payout ledger (TailorPayout for tailors),
// via each role's own self-service endpoint.
//
// Bridge/employee intentionally does NOT get the equivalent BridgePayout
// view here - that ledger is built but switched off server-side
// (settings.BRIDGE_PAYOUTS_ENABLED=False, order_tracking_service.py)
// because Bridge compensation is likely to be salary-based, not per-leg,
// and that decision hasn't been made yet. Showing real-looking "Pending
// ₹30/₹40 per leg" numbers here previously implied a payout scheme that
// was never actually going to pay out that way - a Bridge employee has
// no way to know the numbers are provisional. A simple "coming soon"
// state is honest about that; see BridgeEarningsComingSoon below.
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
  const tailorSummary = useMyPayoutSummary(isTailor);

  if (isBridge) {
    return <BridgeEarningsComingSoon />;
  }

  const { data, isLoading, isError, error, refetch, isRefetching } = tailorQuery;
  const summary = tailorSummary.data;
  const summaryLoading = tailorSummary.isLoading;

  const payouts: TailorSelfPayout[] = data?.payouts ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const renderItem = ({ item }: { item: TailorSelfPayout }) => (
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
            {formatMoney(payoutAmount(item))}
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
                {formatMoney(Number(summary.pending_amount))}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                Pending ({summary.pending_count})
              </Text>
            </View>
            <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: '#10b98120' }}>
              <Text className="text-xl font-bold" style={{ color: '#10b981' }}>
                {formatMoney(Number(summary.paid_amount))}
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
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
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
