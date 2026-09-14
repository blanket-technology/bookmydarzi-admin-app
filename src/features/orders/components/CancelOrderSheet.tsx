import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BottomSheet, Button, Input, Pressable } from '@/components/ui';
import { useAdminCancellationPreview, useCancelOrderMutation, useOrderCancellationRecord } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/errors';

// Admin cancel now routes through the same penalty-aware engine the
// customer apps use (see cancellation_service.admin_cancel_order) instead of
// the old separate no-penalty/100%-refund force-cancel - this preview
// mirrors what the customer would see for the same order/stage, plus an
// admin-only waiver checkbox that zeroes the penalty for goodwill cancels.
export const CancelOrderSheet = ({
  visible,
  onClose,
  orderId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [reason, setReason] = useState('');
  const [waivePenalty, setWaivePenalty] = useState(false);
  const cancelMutation = useCancelOrderMutation();
  const { data: preview, isLoading: loadingPreview, isError: previewFailed } = useAdminCancellationPreview(
    orderId,
    waivePenalty,
    visible,
  );
  // Existing customer-initiated cancellation request for this order, if
  // any - warns before confirming a separate, independent cancellation.
  const { data: existingCancellation } = useOrderCancellationRecord(orderId, visible);

  const reset = () => {
    setReason('');
    setWaivePenalty(false);
  };

  const handleCancel = () => {
    if (!reason.trim()) return;
    cancelMutation.mutate(
      { orderId, payload: { reason, waive_penalty: waivePenalty } },
      { onSuccess: () => { onClose(); reset(); } },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('cancelOrder.title')}>
      {existingCancellation && ['pending', 'approved'].includes(existingCancellation.Status) ? (
        <View
          className="flex-row items-start rounded-2xl p-3 mb-3 border"
          style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}
        >
          <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
          <Text className="text-xs font-semibold ml-2 flex-1" style={{ color: '#92400E' }}>
            {t('cancelOrder.existingRequestWarning', {
              code: existingCancellation.CancellationCode ?? `#${existingCancellation.Id}`,
              status: existingCancellation.Status,
            })}
          </Text>
        </View>
      ) : null}

      {loadingPreview ? (
        <View className="flex-row items-center justify-center py-6 mb-3">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-sm ml-2" style={{ color: colors.textMuted }}>
            {t('cancelOrder.loadingPreview')}
          </Text>
        </View>
      ) : previewFailed ? (
        <View
          className="flex-row items-start rounded-2xl p-3 mb-3 border"
          style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}
        >
          <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
          <Text className="text-xs font-semibold ml-2 flex-1" style={{ color: '#92400E' }}>
            {t('cancelOrder.previewUnavailable')}
          </Text>
        </View>
      ) : preview ? (
        <View
          className="rounded-2xl p-3 mb-3 border"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('cancelOrder.paymentType')}</Text>
            <Text className="text-xs font-semibold capitalize" style={{ color: colors.text }}>{preview.payment_type}</Text>
          </View>
          {preview.payment_type === 'prepaid' ? (
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('cancelOrder.paidAmount')}</Text>
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>{formatCurrency(preview.paid_amount)}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('cancelOrder.penalty')}</Text>
            <Text className="text-xs font-semibold" style={{ color: preview.penalty_amount > 0 ? '#DC2626' : colors.text }}>
              {preview.penalty_amount > 0 ? formatCurrency(preview.penalty_amount) : t('cancelOrder.none')}
            </Text>
          </View>
          {preview.payment_type === 'prepaid' ? (
            <View
              className="flex-row items-center justify-between pt-1.5 mt-0.5 border-t"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>{t('cancelOrder.refundToCustomer')}</Text>
              <Text className="text-sm font-bold" style={{ color: colors.primary }}>{formatCurrency(preview.refund_amount)}</Text>
            </View>
          ) : preview.penalty_amount > 0 ? (
            <Text
              className="text-xs pt-1.5 mt-0.5 border-t"
              style={{ color: colors.textMuted, borderColor: colors.border }}
            >
              {t('cancelOrder.postpaidPenaltyNote')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!loadingPreview && preview && preview.penalty_pct > 0 ? (
        <Pressable
          onPress={() => setWaivePenalty((v) => !v)}
          className="flex-row items-start rounded-2xl p-3 mb-3 border"
          style={{ borderColor: waivePenalty ? colors.primary : colors.border, backgroundColor: waivePenalty ? colors.primaryLight : colors.surface }}
        >
          <View
            className="w-5 h-5 rounded-md items-center justify-center mr-2.5 mt-0.5 border-2"
            style={{
              borderColor: waivePenalty ? colors.primary : colors.border,
              backgroundColor: waivePenalty ? colors.primary : 'transparent',
            }}
          >
            {waivePenalty ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>{t('cancelOrder.waivePenalty')}</Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              {t('cancelOrder.waivePenaltyDescription')}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Input label={t('cancelOrder.reason')} value={reason} onChangeText={setReason} multiline />
      <Button
        title={t('cancelOrder.title')}
        variant="danger"
        onPress={handleCancel}
        loading={cancelMutation.isPending}
        disabled={!reason.trim() || loadingPreview}
        fullWidth
        className="mt-3"
      />
    </BottomSheet>
  );
};
