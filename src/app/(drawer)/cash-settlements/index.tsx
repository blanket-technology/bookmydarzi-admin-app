import { useState } from 'react';
import { FlatList, Linking, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, BottomSheet, Button, EmptyState, Header, Input, Pressable, SkeletonList } from '@/components/ui';
import {
  useAdminCashBalances,
  useAdminCashSettlements,
  useConfirmCashSettlementMutation,
  useRejectCashSettlementMutation,
} from '@/features/payouts/hooks/useCashSettlement';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminCashBalanceSummary, AdminCashSettlement } from '@/types/cashSettlement';
import { formatMoney, formatDate } from '@/utils/errors';

// Admin-only review queue for employee-submitted cash/employee-UPI
// settlements (see cash_ledger_service.py) - the conflict-of-interest
// reason this screen exists at all, not the employee's own cash-balance
// screen. Mirrors bridge-payouts/index.tsx's tab + list shape.
export default function CashSettlementsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [tab, setTab] = useState<'pending' | 'balances' | 'history'>('pending');
  const [reviewTarget, setReviewTarget] = useState<AdminCashSettlement | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const pendingQuery = useAdminCashSettlements('pending', tab === 'pending');
  const historyQuery = useAdminCashSettlements(undefined, tab === 'history');
  const balancesQuery = useAdminCashBalances(tab === 'balances');
  const confirmMutation = useConfirmCashSettlementMutation();
  const rejectMutation = useRejectCashSettlementMutation();

  const settlements: AdminCashSettlement[] =
    (tab === 'pending' ? pendingQuery.data : historyQuery.data) ?? [];
  const balances: AdminCashBalanceSummary[] = balancesQuery.data ?? [];
  const loading = tab === 'pending' ? pendingQuery.isLoading : tab === 'history' ? historyQuery.isLoading : balancesQuery.isLoading;
  const refreshing = tab === 'pending' ? pendingQuery.isRefetching : tab === 'history' ? historyQuery.isRefetching : balancesQuery.isRefetching;
  const onRefresh = () => {
    if (tab === 'pending') pendingQuery.refetch();
    else if (tab === 'history') historyQuery.refetch();
    else balancesQuery.refetch();
  };

  const confirm = (s: AdminCashSettlement) => {
    confirmMutation.mutate({ settlementId: String(s.id) }, { onSuccess: () => setReviewTarget(null) });
  };

  const submitReject = () => {
    if (!reviewTarget || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { settlementId: String(reviewTarget.id), reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setReviewTarget(null);
          setRejecting(false);
          setRejectReason('');
        },
      },
    );
  };

  const renderSettlement = ({ item }: { item: AdminCashSettlement }) => (
    <Pressable
      onPress={() => {
        setReviewTarget(item);
        setRejecting(false);
        setRejectReason('');
      }}
      className="rounded-2xl p-4 mb-3 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.employee_name}
          </Text>
          <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
            {item.settlement_code ?? `#${item.id}`} · {formatDate(item.created_at ?? undefined)}
          </Text>
          {item.method ? (
            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {item.method}
              {item.reference ? ` · ${item.reference}` : ''}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {formatMoney(item.amount)}
          </Text>
          <Badge
            label={item.status}
            backgroundColor={item.status === 'confirmed' ? '#10b98120' : item.status === 'rejected' ? '#ef444420' : '#f59e0b20'}
            color={item.status === 'confirmed' ? '#10b981' : item.status === 'rejected' ? '#ef4444' : '#f59e0b'}
          />
        </View>
      </View>
    </Pressable>
  );

  const renderBalance = ({ item }: { item: AdminCashBalanceSummary }) => (
    <View
      className="rounded-2xl p-4 mb-3 border flex-row items-center justify-between"
      style={{
        backgroundColor: item.is_over_cap ? '#fef2f2' : colors.card,
        borderColor: item.is_over_cap ? '#fecaca' : colors.border,
      }}
    >
      <Text className="font-semibold" style={{ color: colors.text }}>{item.employee_name}</Text>
      <View className="items-end">
        <Text className="font-bold text-base" style={{ color: item.is_over_cap ? '#dc2626' : colors.text }}>
          {formatMoney(item.unsettled_balance)}
        </Text>
        {item.is_over_cap ? (
          <Text className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>Over cap</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Cash Settlements" subtitle="Review employee cash/UPI deposits" />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <View className="flex-row gap-2 mb-4">
          {(['pending', 'balances', 'history'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              className="flex-1 py-2.5 rounded-xl border items-center"
              style={{
                borderColor: tab === value ? colors.primary : colors.border,
                backgroundColor: tab === value ? `${colors.primary}15` : colors.surface,
              }}
            >
              <Text style={{ color: tab === value ? colors.primary : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <SkeletonList count={4} />
        ) : tab === 'balances' ? (
          balances.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="All settled" description="No employee currently holds unsettled cash." />
          ) : (
            <FlatList
              data={balances}
              keyExtractor={(item) => String(item.employee_id)}
              renderItem={renderBalance}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )
        ) : settlements.length === 0 ? (
          <EmptyState icon="document-text-outline" title={tab === 'pending' ? 'Nothing to review' : 'No settlements'} description="" />
        ) : (
          <FlatList
            data={settlements}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSettlement}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      <BottomSheet
        visible={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.employee_name ?? 'Settlement'}
        footer={
          reviewTarget?.status === 'pending' ? (
            rejecting ? (
              <View className="gap-2">
                <Button title="Submit rejection" variant="danger" onPress={submitReject} disabled={!rejectReason.trim()} loading={rejectMutation.isPending} fullWidth />
                <Button title="Cancel" variant="ghost" onPress={() => setRejecting(false)} fullWidth />
              </View>
            ) : (
              <View className="gap-2">
                <Button title="Confirm settlement" onPress={() => reviewTarget && confirm(reviewTarget)} loading={confirmMutation.isPending} fullWidth />
                <Button title="Reject" variant="outline" onPress={() => setRejecting(true)} fullWidth />
              </View>
            )
          ) : null
        }
      >
        {reviewTarget ? (
          <View>
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>
              {formatMoney(reviewTarget.amount)}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {reviewTarget.method ?? 'No method given'}
              {reviewTarget.reference ? ` · ${reviewTarget.reference}` : ''}
            </Text>
            {reviewTarget.employee_note ? (
              <Text className="text-sm mt-3" style={{ color: colors.textSecondary }}>
                Note: {reviewTarget.employee_note}
              </Text>
            ) : null}
            {reviewTarget.proof_image_url ? (
              <Pressable onPress={() => Linking.openURL(reviewTarget.proof_image_url as string)} className="flex-row items-center gap-2 mt-4">
                <Ionicons name="image-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>View deposit proof</Text>
              </Pressable>
            ) : (
              <Text className="text-xs mt-4" style={{ color: colors.textMuted }}>No proof attached</Text>
            )}
            {reviewTarget.admin_note ? (
              <Text className="text-xs mt-4 pt-3 border-t" style={{ color: colors.textSecondary, borderColor: colors.border }}>
                Admin: {reviewTarget.admin_note}
              </Text>
            ) : null}
            {rejecting ? (
              <Input label="Rejection reason" value={rejectReason} onChangeText={setRejectReason} multiline className="mt-4" />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}
