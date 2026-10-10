import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, BottomSheet, Button, ConfirmModal, Input, Loader, Pressable } from '@/components/ui';
import { PAYMENT_STATUS_COLORS, allowedPaymentStatusOptions, paymentStatusLabel } from '@/constants/paymentStatus';
import {
  useCreateRefundMutation,
  useMarkRefundManualMutation,
  usePaymentByOrder,
  usePaymentRefunds,
  useUpdatePaymentStatusMutation,
} from '@/features/payments/hooks/usePayments';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { capitalize, formatMoney, formatDateTime } from '@/utils/errors';
import { DetailRow } from './DetailRow';

// Same field mapping as web's PaymentDetailModal.jsx: TransactionId is
// Razorpay's payment_id (pay_xxx) or a COD-<code> marker; GatewayOrderId/
// razorpay_order_id is Razorpay's order_id (order_xxx). "Stalled checkout" =
// customer opened Razorpay but no payment_id ever came back.
const CopyRow = ({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) => {
  const { t } = useAppLanguage();
  return (
  <Pressable
    onPress={async () => {
      await Clipboard.setStringAsync(value);
      toast.success(t('paymentDetails.copied', { label }));
    }}
    className="flex-row items-center justify-between py-2.5 border-b"
    style={{ borderColor: colors.border }}
  >
    <View className="flex-1 mr-2">
      <Text className="text-xs" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="text-sm font-medium mt-0.5" style={{ color: colors.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
    <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
  </Pressable>
  );
};

/**
 * Payment details bottom sheet, plus its two nested admin-only sheets
 * (correct payment status, issue refund). Owns all of its own local form
 * state and data-fetching (gated on `visible` so nothing queries until the
 * sheet is actually opened) - the parent order screen just controls when
 * it's open. Extracted unchanged in behavior from orders/[id].tsx.
 */
export const PaymentDetailsSheet = ({
  visible,
  onClose,
  orderId,
  isAdminRole,
  isSuperadmin,
  isStaffRole,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  isAdminRole: boolean;
  isSuperadmin: boolean;
  isStaffRole: boolean;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [correctPaymentSheetVisible, setCorrectPaymentSheetVisible] = useState(false);
  const [refundSheetVisible, setRefundSheetVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [txnId, setTxnId] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [manualRefundTargetId, setManualRefundTargetId] = useState<number | null>(null);
  const [manualRefundReference, setManualRefundReference] = useState('');
  const [manualRefundNote, setManualRefundNote] = useState('');
  const [pendingRefundAmount, setPendingRefundAmount] = useState<number | 'full' | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const { data: payment, isLoading: isPaymentLoading, isError: isPaymentError } = usePaymentByOrder(orderId, visible);
  const { data: refunds } = usePaymentRefunds(payment?.Id, visible && isStaffRole);
  const updatePaymentStatusMutation = useUpdatePaymentStatusMutation(orderId);
  const createRefundMutation = useCreateRefundMutation(orderId);
  const markRefundManualMutation = useMarkRefundManualMutation(orderId);

  const handleMarkRefundManual = () => {
    if (!payment || manualRefundTargetId === null || !manualRefundReference.trim()) return;
    markRefundManualMutation.mutate(
      {
        paymentId: String(payment.Id),
        refundId: String(manualRefundTargetId),
        payload: { reference: manualRefundReference.trim(), note: manualRefundNote || undefined },
      },
      {
        onSuccess: () => {
          setManualRefundTargetId(null);
          setManualRefundReference('');
          setManualRefundNote('');
        },
      },
    );
  };

  // Asks first - this edits a financial record - and validates what the backend
  // would otherwise reject with a raw 422.
  const requestCorrectPaymentStatus = (status: string) => {
    if (!payment || updatePaymentStatusMutation.isPending) return;
    if (status === 'success' && !txnId.trim()) {
      toast.error(t('paymentDetails.transactionIdNeeded'));
      return;
    }
    setPendingStatus(status);
  };

  const handleCorrectPaymentStatus = (status: string) => {
    if (!payment || updatePaymentStatusMutation.isPending) return;
    updatePaymentStatusMutation.mutate(
      {
        paymentId: String(payment.Id),
        payload: {
          status,
          transaction_id: status === 'success' ? txnId.trim() || undefined : undefined,
          failure_reason: status === 'failed' ? failureReason.trim() || undefined : undefined,
        },
      },
      {
        onSuccess: () => {
          setCorrectPaymentSheetVisible(false);
          setTxnId('');
          setFailureReason('');
        },
        onSettled: () => setPendingStatus(null),
      },
    );
  };

  // A blank amount means "refund everything refundable"; anything else must be
  // a real amount within what was paid. A typo must never turn a partial refund
  // into a full one (refunds cannot be undone), so the amount is parsed
  // strictly and confirmed before it is sent.
  const requestRefund = () => {
    if (!payment || createRefundMutation.isPending) return;
    const trimmed = refundAmount.trim().replace(',', '.');
    if (!trimmed) {
      setPendingRefundAmount('full');
      return;
    }
    const value = Number(trimmed);
    const paid = Number(payment.Amount);
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed) || !Number.isFinite(value) || value <= 0 || value > paid) {
      toast.error(t('paymentDetails.invalidRefundAmount', { max: formatMoney(paid) }));
      return;
    }
    setPendingRefundAmount(value);
  };

  const handleRefund = () => {
    if (!payment || pendingRefundAmount === null || createRefundMutation.isPending) return;
    const amount = pendingRefundAmount === 'full' ? undefined : pendingRefundAmount;
    createRefundMutation.mutate(
      { paymentId: String(payment.Id), payload: { amount, reason: refundReason.trim() || undefined } },
      {
        onSuccess: () => {
          setRefundSheetVisible(false);
          setRefundAmount('');
          setRefundReason('');
        },
        onSettled: () => setPendingRefundAmount(null),
      },
    );
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={t('paymentDetails.title')}>
        {isPaymentLoading ? (
          <Loader message={t('paymentDetails.loadingPayment')} />
        ) : isPaymentError || !payment ? (
          <Text className="text-sm py-4" style={{ color: colors.textSecondary }}>
            {t('paymentDetails.noPaymentRecord')}
          </Text>
        ) : (() => {
          const paymentId = payment.TransactionId ?? undefined;
          const gatewayOrderId = payment.razorpay_order_id ?? undefined;
          const isCod = typeof paymentId === 'string' && paymentId.startsWith('COD-');
          const isStalledCheckout = !isCod && payment.Status?.toLowerCase() === 'initiated' && !paymentId;
          return (
          <>
            <View className="flex-row items-center justify-between mb-3">
              <Badge
                label={paymentStatusLabel(payment.Status)}
                backgroundColor={`${PAYMENT_STATUS_COLORS[payment.Status] ?? colors.primary}20`}
                color={PAYMENT_STATUS_COLORS[payment.Status] ?? colors.primary}
              />
              <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                {formatMoney(payment.Amount)}
              </Text>
            </View>

            {isStalledCheckout ? (
              <View className="flex-row items-start gap-2 rounded-2xl px-3.5 py-3 mb-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }}>
                <Ionicons name="warning-outline" size={16} color="#d97706" style={{ marginTop: 1 }} />
                <Text className="text-xs flex-1" style={{ color: '#92400e' }}>
                  <Text className="font-bold">{t('paymentDetails.checkoutNeverCompleted')}</Text> {t('paymentDetails.checkoutNeverCompletedBody')}
                </Text>
              </View>
            ) : null}

            <DetailRow label={t('paymentDetails.paymentCode')} value={payment.PaymentCode ?? '—'} colors={colors} />
            <DetailRow label={t('paymentDetails.type')} value={capitalize(payment.PaymentType ?? 'booking')} colors={colors} />
            <DetailRow label={t('paymentDetails.method')} value={capitalize(payment.Method ?? '—')} colors={colors} />
            {!isCod && paymentId ? (
              <View className="mt-3 mb-1">
                <Text className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>
                  {t('paymentDetails.razorpayReferences')}
                </Text>
                <View className="rounded-xl px-3.5" style={{ backgroundColor: colors.surface }}>
                  <CopyRow label={t('paymentDetails.orderId')} value={gatewayOrderId ?? '—'} colors={colors} />
                  <CopyRow label={t('paymentDetails.paymentId')} value={paymentId} colors={colors} />
                </View>
              </View>
            ) : (
              <DetailRow label={t('paymentDetails.transactionId')} value={payment.TransactionId ?? '—'} colors={colors} />
            )}
            {payment.FailureReason ? (
              <DetailRow label={t('paymentDetails.failureReason')} value={payment.FailureReason} colors={colors} />
            ) : null}
            <DetailRow label={t('orderSummary.created')} value={formatDateTime(payment.CreatedAt)} colors={colors} />

            {isStaffRole && refunds && refunds.length > 0 ? (
              <View className="mt-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                  {t('paymentDetails.refundHistory')}
                </Text>
                {refunds.map((refund) => (
                  <View key={refund.id} className="py-2 border-b" style={{ borderColor: colors.border }}>
                    <View className="flex-row justify-between">
                      <Text className="text-sm" style={{ color: colors.textSecondary }}>
                        {refund.refund_code ?? `#${refund.id}`} · {capitalize(refund.status)}
                      </Text>
                      <Text className="text-sm font-medium" style={{ color: colors.text }}>
                        {formatMoney(refund.amount)}
                      </Text>
                    </View>
                    {refund.status === 'manual_completed' && refund.manual_reference ? (
                      <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {t('paymentDetails.manualRefundReference', { reference: refund.manual_reference })}
                      </Text>
                    ) : null}
                    {isAdminRole && refund.status === 'failed' ? (
                      <Button
                        title={t('paymentDetails.markRefundManual')}
                        variant="outline"
                        className="mt-2"
                        onPress={() => setManualRefundTargetId(refund.id)}
                        fullWidth
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {isAdminRole && payment.Status === 'success' ? (
              <Button title={t('paymentDetails.issueRefund')} variant="danger" className="mt-4" onPress={() => setRefundSheetVisible(true)} fullWidth />
            ) : null}
            {isSuperadmin ? (
              <Button
                title={t('paymentDetails.correctPaymentStatus')}
                variant="outline"
                className="mt-3"
                onPress={() => setCorrectPaymentSheetVisible(true)}
                fullWidth
              />
            ) : null}
          </>
          );
        })()}
      </BottomSheet>

      <BottomSheet visible={correctPaymentSheetVisible} onClose={() => setCorrectPaymentSheetVisible(false)} title={t('paymentDetails.correctPaymentStatus')}>
        <Input label={t('paymentDetails.transactionIdRequired')} value={txnId} onChangeText={setTxnId} />
        <Input label={t('paymentDetails.failureReasonUsed')} value={failureReason} onChangeText={setFailureReason} multiline />
        {allowedPaymentStatusOptions(payment?.Status).length === 0 ? (
          <Text className="text-sm py-3" style={{ color: colors.textSecondary }}>
            {t('paymentDetails.noStatusChanges')}
          </Text>
        ) : (
          allowedPaymentStatusOptions(payment?.Status).map((option) => (
            <Pressable
              key={option.value}
              onPress={() => requestCorrectPaymentStatus(option.value)}
              disabled={updatePaymentStatusMutation.isPending}
              accessibilityRole="button"
              className="py-3 border-b"
              style={{ borderColor: colors.border, opacity: updatePaymentStatusMutation.isPending ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.text }}>{option.label}</Text>
            </Pressable>
          ))
        )}
      </BottomSheet>

      <BottomSheet
        visible={refundSheetVisible}
        onClose={() => setRefundSheetVisible(false)}
        title={t('paymentDetails.issueRefund')}
        footer={
          <Button title={t('paymentDetails.confirmRefund')} variant="danger" onPress={requestRefund} loading={createRefundMutation.isPending} fullWidth />
        }
      >
        <Input label={t('paymentDetails.amountBlankForFull')} value={refundAmount} onChangeText={setRefundAmount} keyboardType="decimal-pad" />
        <Input label={t('rejectOrder.reasonOptional')} value={refundReason} onChangeText={setRefundReason} multiline />
      </BottomSheet>

      <ConfirmModal
        visible={pendingRefundAmount !== null}
        title={t('paymentDetails.confirmRefundTitle')}
        message={
          pendingRefundAmount === 'full'
            ? t('paymentDetails.confirmRefundFull', { amount: formatMoney(payment?.Amount) })
            : t('paymentDetails.confirmRefundPartial', {
                amount: formatMoney(typeof pendingRefundAmount === 'number' ? pendingRefundAmount : 0),
              })
        }
        confirmLabel={t('paymentDetails.confirmRefund')}
        loading={createRefundMutation.isPending}
        onConfirm={handleRefund}
        onCancel={() => setPendingRefundAmount(null)}
      />

      <ConfirmModal
        visible={pendingStatus !== null}
        title={t('paymentDetails.confirmStatusTitle')}
        message={
          pendingStatus === 'refunded'
            ? t('paymentDetails.confirmStatusRefunded')
            : t('paymentDetails.confirmStatusBody', { status: paymentStatusLabel(pendingStatus) })
        }
        confirmLabel={t('paymentDetails.correctPaymentStatus')}
        loading={updatePaymentStatusMutation.isPending}
        onConfirm={() => pendingStatus && handleCorrectPaymentStatus(pendingStatus)}
        onCancel={() => setPendingStatus(null)}
      />

      <BottomSheet
        visible={manualRefundTargetId !== null}
        onClose={() => {
          setManualRefundTargetId(null);
          setManualRefundReference('');
          setManualRefundNote('');
        }}
        title={t('paymentDetails.markRefundManual')}
        footer={
          <Button
            title={t('paymentDetails.markRefundManual')}
            variant="outline"
            onPress={handleMarkRefundManual}
            loading={markRefundManualMutation.isPending}
            disabled={!manualRefundReference.trim()}
            fullWidth
          />
        }
      >
        <Text className="text-sm leading-5 mb-3" style={{ color: colors.textSecondary }}>
          {t('paymentDetails.markRefundManualHelp')}
        </Text>
        <Input
          label={t('paymentDetails.manualReferenceRequired')}
          value={manualRefundReference}
          onChangeText={setManualRefundReference}
        />
        <Input label={t('rejectOrder.reasonOptional')} value={manualRefundNote} onChangeText={setManualRefundNote} multiline />
      </BottomSheet>
    </>
  );
};
