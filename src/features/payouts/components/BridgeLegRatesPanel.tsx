import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Input, Loader, Pressable } from '@/components/ui';
import { useStaff } from '@/features/staff/hooks/useStaff';
import {
  useBridgeLegRates,
  useDeleteBridgeLegRateMutation,
  useUpsertBridgeLegRateMutation,
} from '@/features/payouts/hooks/useBridgePayouts';
import { useTheme } from '@/hooks/useTheme';
import type { BridgeLegType } from '@/types/bridgePayouts';
import { LEG_TYPE_LABELS } from '@/features/payouts/legTypeLabels';

const LEG_TYPES = Object.keys(LEG_TYPE_LABELS) as BridgeLegType[];

// Admin sets a flat rate per (employee, leg_type) or an employee-wide
// default (leg_type left blank) - the backend resolves the most specific
// match at payout-creation time, falling back to the platform default
// (settings.DEFAULT_BRIDGE_LEG_RATES) when no rate is set, so this panel is
// optional to use, not a blocker. Mirrors CommissionRatesPanel exactly.
export function BridgeLegRatesPanel() {
  const { colors } = useTheme();
  const { data: rates, isLoading: ratesLoading } = useBridgeLegRates();
  const { data: employees } = useStaff({ role: 'employee' });
  const upsertMutation = useUpsertBridgeLegRateMutation();
  const deleteMutation = useDeleteBridgeLegRateMutation();

  const [employeeId, setEmployeeId] = useState<string>('');
  const [legType, setLegType] = useState<BridgeLegType | ''>('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const employeeList = employees ?? [];

  const handleSave = () => {
    if (upsertMutation.isPending) return;
    if (!employeeId || !amount) {
      setFormError('Select a Bridge employee and enter a rate amount.');
      return;
    }
    const cleaned = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0) {
      setFormError('Enter a rate greater than 0, e.g. 40 or 42.50.');
      return;
    }
    setFormError('');
    upsertMutation.mutate(
      {
        employee_id: Number(employeeId),
        leg_type: legType || null,
        rate_amount: cleaned,
      },
      {
        onSuccess: () => {
          setEmployeeId('');
          setLegType('');
          setAmount('');
        },
      },
    );
  };

  const handleDelete = (rateId: number) => {
    if (deleteMutation.isPending) return;
    Alert.alert(
      'Remove leg rate?',
      'Earnings for this employee will fall back to the default leg rate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDeletingId(rateId);
            deleteMutation.mutate(String(rateId), { onSettled: () => setDeletingId(null) });
          },
        },
      ],
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="rounded-3xl p-4 mb-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <Text className="text-sm font-bold mb-3" style={{ color: colors.text }}>
          Set Leg Rate
        </Text>

        <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
          Bridge employee
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row" style={{ gap: 8 }}>
            {employeeList.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setEmployeeId(e.id)}
                className="px-3.5 py-2 rounded-xl border"
                style={{
                  backgroundColor: employeeId === e.id ? colors.primary : colors.surface,
                  borderColor: employeeId === e.id ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: employeeId === e.id ? '#fff' : colors.text }}
                >
                  {e.full_name ?? `Employee #${e.id}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
          Leg type (optional - blank applies to all)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row" style={{ gap: 8 }}>
            <Pressable
              onPress={() => setLegType('')}
              className="px-3.5 py-2 rounded-xl border"
              style={{
                backgroundColor: legType === '' ? colors.primary : colors.surface,
                borderColor: legType === '' ? colors.primary : colors.border,
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: legType === '' ? '#fff' : colors.text }}>
                All legs
              </Text>
            </Pressable>
            {LEG_TYPES.map((lt) => (
              <Pressable
                key={lt}
                onPress={() => setLegType(lt)}
                className="px-3.5 py-2 rounded-xl border"
                style={{
                  backgroundColor: legType === lt ? colors.primary : colors.surface,
                  borderColor: legType === lt ? colors.primary : colors.border,
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: legType === lt ? '#fff' : colors.text }}>
                  {LEG_TYPE_LABELS[lt]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Input
          label="Rate amount (₹)"
          value={amount}
          onChangeText={setAmount}
          placeholder="30.00"
          keyboardType="decimal-pad"
          error={formError || undefined}
        />
        <Button title="Save Rate" onPress={handleSave} loading={upsertMutation.isPending} />
      </View>

      {ratesLoading ? (
        <Loader />
      ) : (rates ?? []).length === 0 ? (
        <Text className="text-sm text-center py-8" style={{ color: colors.textMuted }}>
          No custom rates set - payouts use the platform default rate per leg.
        </Text>
      ) : (
        (rates ?? []).map((r) => (
          <View
            key={r.id}
            className="flex-row items-center justify-between rounded-2xl p-3.5 mb-2.5 border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-1 mr-2">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {r.employee_name ?? `#${r.employee_id}`}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {r.leg_type ? LEG_TYPE_LABELS[r.leg_type] : 'All legs'}
              </Text>
            </View>
            <Text className="text-sm font-bold mr-3" style={{ color: colors.text }}>
              ₹{Number(r.rate_amount).toFixed(2)}
            </Text>
            <Pressable
              onPress={() => handleDelete(r.id)}
              disabled={deletingId === r.id}
              className="px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: `${colors.error}15` }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.error }}>
                {deletingId === r.id ? '…' : 'Remove'}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
