import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, Header, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { usePayouts } from '@/features/payouts/hooks/usePayouts';
import { MarkPaidSheet } from '@/features/payouts/components/MarkPaidSheet';
import { CommissionRatesPanel } from '@/features/payouts/components/CommissionRatesPanel';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { Payout } from '@/types/payouts';
import { formatApiErrorDetail, formatMoney, formatDate } from '@/utils/errors';

const LIMIT = 20;

// Superadmin-only (backend: require_admin_permission(SUPERADMIN, screen=
// "tailor_payouts")) - RoutePermissionGuard already keeps a non-superadmin
// from reaching this route at all, mirrored here only via the drawer's
// `payouts` permission (see CustomDrawer.tsx), same as billing/index.tsx.
export default function PayoutsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [tab, setTab] = useState<'payouts' | 'rates'>('payouts');
  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'paid'>('');
  const [page, setPage] = useState(1);
  const [markPaidPayout, setMarkPaidPayout] = useState<Payout | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = usePayouts(
    { page, limit: LIMIT, status: statusFilter || undefined },
    tab === 'payouts',
  );

  const payouts = data?.payouts ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const renderItem = ({ item }: { item: Payout }) => (
    <View className="rounded-3xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.order_code ?? `#${item.order_id}`}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {item.tailor_name ?? `Tailor #${item.tailor_id}`}
          </Text>
          <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {formatMoney(Number(item.payout_amount))}
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
          {formatMoney(Number(item.order_amount))} · {Number(item.commission_percent).toFixed(2)}%
        </Text>
        {item.status === 'pending' ? (
          <Pressable
            onPress={() => setMarkPaidPayout(item)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
              Mark Paid
            </Text>
          </Pressable>
        ) : item.payout_reference ? (
          <Text className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
            {item.payout_reference}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Tailor Payouts" subtitle="Commission rates & payout tracking" />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <View className="flex-row mb-3 p-1 rounded-2xl self-start" style={{ backgroundColor: colors.surface, gap: 4 }}>
          {(['payouts', 'rates'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: tab === t ? colors.primary : 'transparent' }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: tab === t ? '#fff' : colors.textSecondary }}
              >
                {t === 'payouts' ? 'Payouts' : 'Commission Rates'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'rates' ? (
          <CommissionRatesPanel />
        ) : (
          <>
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
                title="Failed to load payouts"
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
                ListEmptyComponent={<EmptyState icon="wallet-outline" title="No payouts yet" />}
                ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
              />
            )}
          </>
        )}
      </View>

      {markPaidPayout ? (
        <MarkPaidSheet payout={markPaidPayout} onClose={() => setMarkPaidPayout(null)} />
      ) : null}
    </View>
  );
}
