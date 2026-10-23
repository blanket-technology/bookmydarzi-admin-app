import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useAdminItemCancellationPreview, useCancelOrderItemMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/errors';

// Per-item sibling of CancelOrderSheet.tsx - cancels ONE line item within a
// multi-item order, without touching the rest of the order. Only usable in
// the same self-service-cancellable stages the whole-order flow enforces
// (before TAILOR_ASSIGNED); blocked entirely once that's passed, or when
// this would be the last remaining active item (use the whole-order cancel
// instead - see item_cancellation_service.py's is_last_active_item guard).
export const CancelOrderItemSheet = ({
  visible,
  onClose,
  orderId,
  itemId,
  itemName,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  itemId: string;
  itemName?: string | null;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [reason, setReason] = useState('');
  const cancelMutation = useCancelOrderItemMutation();
  const { data: preview, isLoading: loadingPreview, isError: previewFailed } = useAdminItemCancellationPreview(
    orderId,
    itemId,
    visible,
  );

  const isReasonTooShort = reason.trim().length > 0 && reason.trim().length < 5;

  const reset = () => setReason('');

  const handleCancel = () => {
    if (reason.trim().length < 5) return;
    cancelMutation.mutate(
      { orderId, itemId, payload: { reason } },
      { onSuccess: () => { onClose(); reset(); } },
    );
  };

  const blocked = preview ? !preview.cancellation_allowed : false;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('cancelItem.title')}
      footer={
        blocked ? undefined : (
          <Button
            title={t('cancelItem.title')}
            variant="danger"
            onPress={handleCancel}
            loading={cancelMutation.isPending}
            disabled={reason.trim().length < 5 || loadingPreview}
            fullWidth
          />
        )
      }
    >
      {itemName ? (
        <Text className="text-sm font-semibold mb-3" style={{ color: colors.text }}>
          {itemName}
        </Text>
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
      ) : preview && blocked ? (
        <View
          className="flex-row items-start rounded-2xl p-3 mb-3 border"
          style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}
        >
          <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
          <Text className="text-xs font-semibold ml-2 flex-1" style={{ color: '#92400E' }}>
            {preview.cancel_reason ?? t('cancelOrder.previewUnavailable')}
          </Text>
        </View>
      ) : preview ? (
        <View
          className="rounded-2xl p-3 mb-3 border"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('cancelItem.itemPrice')}</Text>
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>{formatCurrency(preview.item_price)}</Text>
          </View>
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('cancelOrder.paymentType')}</Text>
            <Text className="text-xs font-semibold capitalize" style={{ color: colors.text }}>{preview.payment_type}</Text>
          </View>
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

      {!blocked ? (
        <Input
          label={t('cancelOrder.reason')}
          value={reason}
          onChangeText={setReason}
          multiline
          error={isReasonTooShort ? t('cancelOrder.reasonTooShort') : undefined}
        />
      ) : null}
    </BottomSheet>
  );
};
