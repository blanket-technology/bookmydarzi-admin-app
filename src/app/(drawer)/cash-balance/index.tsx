import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Badge, Button, EmptyState, Header, Input, Loader, Pressable, SkeletonList, BottomSheet } from '@/components/ui';
import {
  useMyCashBalance,
  useMyCashLedger,
  useMyCashSettlements,
  useSubmitCashSettlementMutation,
  useUploadCashSettlementProofMutation,
} from '@/features/payouts/hooks/useCashSettlement';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { CashLedgerEntry, CashSettlement } from '@/types/cashSettlement';
import { formatMoney, formatDate } from '@/utils/errors';

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#f59e0b20', fg: '#f59e0b' },
  confirmed: { bg: '#10b98120', fg: '#10b981' },
  rejected: { bg: '#ef444420', fg: '#ef4444' },
};

export default function CashBalanceScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [tab, setTab] = useState<'unsettled' | 'history'>('unsettled');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const balanceQuery = useMyCashBalance();
  const ledgerQuery = useMyCashLedger(tab === 'unsettled');
  const settlementsQuery = useMyCashSettlements(tab === 'history');
  const submitSettlement = useSubmitCashSettlementMutation();
  const uploadProof = useUploadCashSettlementProofMutation();

  const balance = balanceQuery.data;
  const ledger: CashLedgerEntry[] = ledgerQuery.data ?? [];
  const settlements: CashSettlement[] = settlementsQuery.data ?? [];

  const openSheet = () => {
    setAmount(balance ? String(balance.unsettled_balance) : '');
    setMethod('');
    setReference('');
    setNote('');
    setSheetVisible(true);
  };

  const submit = () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    submitSettlement.mutate(
      { amount: value, method: method || undefined, reference: reference || undefined, note: note || undefined },
      {
        onSuccess: (settlement) => {
          setSheetVisible(false);
          attachProofIfPicked(settlement.id);
        },
      },
    );
  };

  // Optional: let the employee attach a deposit-slip / transfer screenshot
  // right after submitting, without a separate upload step. Skipped
  // silently if they decline the picker - a settlement without proof can
  // still be reviewed, just with less for admin to go on.
  const attachProofIfPicked = async (settlementId: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadProof.mutate({
      settlementId: String(settlementId),
      file: { uri: asset.uri, fileName: asset.fileName ?? 'proof.jpg', mimeType: asset.mimeType ?? 'image/jpeg' },
    });
  };

  const renderLedgerItem = ({ item }: { item: CashLedgerEntry }) => (
    <View className="rounded-2xl p-4 mb-3 border flex-row items-center justify-between" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-1 mr-2">
        <Text className="font-bold text-base" style={{ color: colors.text }}>
          {item.order_code ?? `Order #${item.order_id}`}
        </Text>
        <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
          {item.channel === 'employee_upi' ? 'My UPI' : 'Cash'} · {formatDate(item.created_at ?? undefined)}
        </Text>
      </View>
      <Text className="font-bold text-base" style={{ color: colors.text }}>
        {formatMoney(item.amount)}
      </Text>
    </View>
  );

  const renderSettlementItem = ({ item }: { item: CashSettlement }) => {
    const tone = STATUS_COLOR[item.status] ?? STATUS_COLOR.pending;
    return (
      <View className="rounded-2xl p-4 mb-3 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {item.settlement_code ?? `Settlement #${item.id}`}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {formatDate(item.created_at ?? undefined)}
              {item.method ? ` · ${item.method}` : ''}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              {formatMoney(item.amount)}
            </Text>
            <Badge label={item.status} backgroundColor={tone.bg} color={tone.fg} />
          </View>
        </View>
        {item.admin_note ? (
          <Text className="text-xs mt-2 pt-2 border-t" style={{ color: colors.textSecondary, borderColor: colors.border }}>
            Admin: {item.admin_note}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Cash Balance" subtitle="Cash & UPI you're holding for the company" />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {balanceQuery.isLoading ? (
          <Loader />
        ) : balance ? (
          <View
            className="rounded-3xl p-5 mb-4 border"
            style={{
              backgroundColor: balance.is_over_cap ? '#fef2f2' : colors.card,
              borderColor: balance.is_over_cap ? '#fecaca' : colors.border,
            }}
          >
            <Text className="text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>
              Unsettled balance
            </Text>
            <Text className="text-3xl font-bold mt-1" style={{ color: balance.is_over_cap ? '#dc2626' : colors.text }}>
              {formatMoney(balance.unsettled_balance)}
            </Text>
            {balance.is_over_cap ? (
              <View className="flex-row items-center gap-1.5 mt-2">
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                  Over the {formatMoney(balance.cap)} limit - settle some cash to keep getting new COD deliveries
                </Text>
              </View>
            ) : (
              <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                Limit: {formatMoney(balance.cap)}
              </Text>
            )}
            {balance.unsettled_balance > 0 ? (
              <Button title="Submit a settlement" onPress={openSheet} className="mt-4" fullWidth />
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setTab('unsettled')}
            className="flex-1 py-2.5 rounded-xl border items-center"
            style={{
              borderColor: tab === 'unsettled' ? colors.primary : colors.border,
              backgroundColor: tab === 'unsettled' ? `${colors.primary}15` : colors.surface,
            }}
          >
            <Text style={{ color: tab === 'unsettled' ? colors.primary : colors.text, fontWeight: '600' }}>Unsettled</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('history')}
            className="flex-1 py-2.5 rounded-xl border items-center"
            style={{
              borderColor: tab === 'history' ? colors.primary : colors.border,
              backgroundColor: tab === 'history' ? `${colors.primary}15` : colors.surface,
            }}
          >
            <Text style={{ color: tab === 'history' ? colors.primary : colors.text, fontWeight: '600' }}>Settlements</Text>
          </Pressable>
        </View>

        {tab === 'unsettled' ? (
          ledgerQuery.isLoading ? (
            <SkeletonList count={4} />
          ) : ledger.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="Nothing unsettled" description="Every collection you've made has been settled." />
          ) : (
            <FlatList
              data={ledger}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderLedgerItem}
              refreshControl={<RefreshControl refreshing={ledgerQuery.isRefetching} onRefresh={() => { void ledgerQuery.refetch(); }} />}
            />
          )
        ) : settlementsQuery.isLoading ? (
          <SkeletonList count={4} />
        ) : settlements.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No settlements yet" description="Submit a settlement once you've deposited cash or transferred it to the company." />
        ) : (
          <FlatList
            data={settlements}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSettlementItem}
            refreshControl={<RefreshControl refreshing={settlementsQuery.isRefetching} onRefresh={() => { void settlementsQuery.refetch(); }} />}
          />
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Submit a settlement"
        footer={
          <Button
            title="Submit"
            onPress={submit}
            loading={submitSettlement.isPending}
            disabled={!Number(amount) || Number(amount) <= 0}
            fullWidth
          />
        }
      >
        <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          Deposited or transferred this amount to the company? Submit it here for admin to confirm.
        </Text>
        <Input label="Amount deposited (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Input label="How (e.g. Company UPI, Bank transfer)" value={method} onChangeText={setMethod} />
        <Input label="Reference / UTR (optional)" value={reference} onChangeText={setReference} />
        <Input label="Note (optional)" value={note} onChangeText={setNote} multiline />
        <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
          You'll be asked to attach a deposit-slip or transfer screenshot after submitting.
        </Text>
      </BottomSheet>
    </View>
  );
}
