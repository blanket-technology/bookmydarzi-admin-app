import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useMarkPayoutPaidMutation } from '@/features/payouts/hooks/usePayouts';
import { useTheme } from '@/hooks/useTheme';
import type { Payout } from '@/types/payouts';
import { formatMoney, getUserFacingMessage } from '@/utils/errors';

export function MarkPaidSheet({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const { colors } = useTheme();
  const [payoutReference, setPayoutReference] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const mutation = useMarkPayoutPaidMutation();

  const handleSubmit = () => {
    if (mutation.isPending) return;
    if (!payoutReference.trim()) {
      setValidationError('A payout reference (bank UTR / transaction ref) is required.');
      return;
    }
    setValidationError('');
    // Recording a payout as paid is a ledger entry about real money: confirm
    // exactly how much and to whom before it is written.
    Alert.alert(
      'Mark payout as paid?',
      `Confirm you have already transferred ${formatMoney(Number(payout.payout_amount))} (ref ${payoutReference.trim()}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: () => {
            mutation.reset();
            mutation.mutate(
              {
                payoutId: String(payout.id),
                payload: { payout_reference: payoutReference.trim(), notes: notes.trim() || undefined },
              },
              { onSuccess: onClose },
            );
          },
        },
      ],
    );
  };

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="Mark Payout Paid"
      footer={
        <Button title="Mark Paid" onPress={handleSubmit} loading={mutation.isPending} fullWidth />
      }
    >
      <View className="rounded-2xl p-3 mb-4" style={{ backgroundColor: colors.surface }}>
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Tailor</Text>
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            {payout.tailor_name ?? `#${payout.tailor_id}`}
          </Text>
        </View>
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Order amount</Text>
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            {formatMoney(Number(payout.order_amount))}
          </Text>
        </View>
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Commission</Text>
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            {Number(payout.commission_percent).toFixed(2)}%
          </Text>
        </View>
        <View
          className="flex-row justify-between pt-1.5 mt-1.5 border-t"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>Payout amount</Text>
          <Text className="text-sm font-bold" style={{ color: '#10b981' }}>
            {formatMoney(Number(payout.payout_amount))}
          </Text>
        </View>
      </View>

      <Input
        label="Payout reference (bank UTR / transaction ref)"
        value={payoutReference}
        onChangeText={setPayoutReference}
        placeholder="e.g. UTR2026091812345"
        error={validationError || undefined}
        autoFocus
      />
      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Paid via NEFT on 21 Sep"
      />
      {mutation.isError ? (
        <Text className="text-xs mt-1" style={{ color: colors.error }}>
          {getUserFacingMessage(mutation.error)}
        </Text>
      ) : null}
    </BottomSheet>
  );
}
