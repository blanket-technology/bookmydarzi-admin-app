import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useAdminItemCancellationPreview, useCancelOrderItemMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/errors';

// Same quick-pick reasons as the customer-facing cancel modals (web +
// app) - kept identical everywhere so this feels like one consistent
// flow regardless of which app someone is cancelling from. "Other"
// clears the field for free text instead of leaving a chip's wording in
// it, since admin reasons are often operationally specific ("customer
// called support", "wrong tailor assigned") rather than one of these.
const CANCEL_ITEM_REASONS = [
  'Ordered by mistake',
  'Found a better price elsewhere',
  'No longer needed',
  'Taking too long',
  'Wrong size or measurement',
  'Other',
];

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
      <View className="flex-row items-center mb-4">
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <Ionicons name="close" size={20} color="#DC2626" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-black" style={{ color: colors.text }}>
            {t('cancelItem.title')}
          </Text>
          {itemName ? (
            <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {itemName}
            </Text>
          ) : null}
        </View>
      </View>

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
          {preview.payment_type === 'prepaid' ? (
            <View
              className="flex-row items-center justify-between pt-1.5 mt-0.5 border-t"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>{t('cancelOrder.refundToCustomer')}</Text>
              <Text className="text-sm font-bold" style={{ color: colors.primary }}>{formatCurrency(preview.refund_amount)}</Text>
            </View>
          ) : null}
          <Text
            className="text-xs pt-1.5 mt-1.5 border-t"
            style={{ color: colors.textMuted, borderColor: colors.border }}
          >
            {t('cancelItem.noChargeNote')}
          </Text>
        </View>
      ) : null}

      {!blocked ? (
        <>
          <View className="flex-row flex-wrap mb-3" style={{ gap: 8 }}>
            {CANCEL_ITEM_REASONS.map((option) => {
              const active = reason === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setReason(active ? '' : option === 'Other' ? '' : option)}
                  className="rounded-full px-3.5 py-1.5 border"
                  style={{
                    borderColor: active ? colors.text : colors.border,
                    backgroundColor: active ? colors.text : 'transparent',
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? '#fff' : colors.textSecondary }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label={t('cancelOrder.reason')}
            value={reason}
            onChangeText={setReason}
            multiline
            error={isReasonTooShort ? t('cancelOrder.reasonTooShort') : undefined}
          />
        </>
      ) : null}
    </BottomSheet>
  );
};
