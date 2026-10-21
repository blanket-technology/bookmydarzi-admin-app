import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View, useWindowDimensions } from 'react-native';
import { BottomSheet, Button, Pressable } from '@/components/ui';
import {
  useCancelDeliveryQrMutation,
  useCollectPaymentMutation,
  useCompleteOrderMutation,
  useCreateDeliveryQrMutation,
  useDeliveryPaymentStatus,
} from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getUserFacingMessage } from '@/utils/errors';

type Tab = 'qr' | 'cash';

const formatRupees = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Delivery-time payment, in the style of Blinkit/Flipkart: the delivery person
 * shows a QR for the exact balance; the customer scans and pays with any UPI
 * app, and this sheet (and the order) update on their own the moment the money
 * arrives - nobody taps "paid". If the QR cannot be used there is a Cash (COD)
 * fallback that records exactly the amount due.
 *
 * The amount always comes from the backend (the order's remaining balance); it
 * is never typed in, so it cannot be mistyped or understated.
 */
export const CollectPaymentSheet = ({
  visible,
  onClose,
  orderId,
  orderCode,
  remainingAmount,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderCode?: string | null;
  /** The order's balance due as last loaded; the sheet shows the backend's
   * own figure from the payment status once it has one. */
  remainingAmount?: number | null;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [tab, setTab] = useState<Tab>('qr');
  const [cashConfirmed, setCashConfirmed] = useState(false);
  // Cash recorded in this session: the backend now reports no balance, but show the
  // "paid" state (not "nothing to collect") until the delivery is confirmed.
  const [cashRecorded, setCashRecorded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const autoCreatedFor = useRef<string | null>(null);

  const statusQuery = useDeliveryPaymentStatus(orderId, visible);
  const createQr = useCreateDeliveryQrMutation();
  const cancelQr = useCancelDeliveryQrMutation();
  const collectCash = useCollectPaymentMutation();
  const completeDelivery = useCompleteOrderMutation();

  const status = statusQuery.data;
  const state = status?.status;
  const dueAmount = status?.amount ?? remainingAmount ?? 0;
  const isPaid = state === 'paid' || cashRecorded;

  // Fresh state every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setTab('qr');
      setCashConfirmed(false);
      setCashRecorded(false);
      setImageFailed(false);
      completeDelivery.reset();
      autoCreatedFor.current = null;
      createQr.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Show the QR straight away: when the backend has no live QR for this order
  // yet, generate one automatically (once per open).
  useEffect(() => {
    if (!visible || tab !== 'qr') return;
    if (state !== 'none' || dueAmount <= 0) return;
    if (createQr.isPending || createQr.isError) return;
    if (autoCreatedFor.current === orderId) return;
    autoCreatedFor.current = orderId;
    createQr.mutate(orderId);
  }, [visible, tab, state, dueAmount, orderId, createQr]);

  // One-second clock for the expiry countdown, only while a QR is live.
  useEffect(() => {
    if (!visible || state !== 'pending') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, state]);

  const expiresMs = status?.expires_at ? new Date(status.expires_at).getTime() : null;
  const secondsLeft = expiresMs ? Math.floor((expiresMs - now) / 1000) : null;

  // The moment the countdown hits zero, ask the backend: it closes the QR and
  // reports `expired`, so a QR can never be shown past its validity.
  useEffect(() => {
    if (state === 'pending' && secondsLeft !== null && secondsLeft <= 0) {
      statusQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, secondsLeft]);

  // Paid: confirm with a haptic. The sheet then stays open on "Mark as delivered",
  // so collecting and handing over are one flow instead of two disconnected steps.
  useEffect(() => {
    if (!visible || !isPaid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [visible, isPaid]);

  const regenerate = useCallback(() => {
    setImageFailed(false);
    createQr.mutate(orderId);
  }, [createQr, orderId]);

  const confirmCash = () => {
    if (!cashConfirmed || dueAmount <= 0) return;
    collectCash.mutate(
      { orderId, payload: { method: 'cash', amount: dueAmount } },
      {
        onSuccess: () => {
          setCashRecorded(true);
          statusQuery.refetch();
        },
        // e.g. "already paid by QR": show the true state instead of a stale one.
        onError: () => statusQuery.refetch(),
      },
    );
  };

  const qrSize = Math.max(160, Math.min(screenWidth - 96, screenHeight * 0.3, 240));
  const qrLive = state === 'pending' && !!status?.qr_image_url && (secondsLeft ?? 1) > 0;
  const qrDead = state === 'expired' || state === 'cancelled' || (state === 'pending' && (secondsLeft ?? 1) <= 0);
  const creating = createQr.isPending || (statusQuery.isLoading && !status);
  const createError = createQr.isError ? getUserFacingMessage(createQr.error) : null;
  const loadError = statusQuery.isError && !status ? getUserFacingMessage(statusQuery.error) : null;
  const noBalance = !isPaid && state !== 'pending' && dueAmount <= 0 && !statusQuery.isLoading;

  // ----------------------------------------------------------------- footer
  let footer: React.ReactNode = null;
  if (isPaid || noBalance) {
    footer = (
      <View className="gap-2">
        <Button
          title={t('orderActions.markDelivered')}
          onPress={() => completeDelivery.mutate({ orderId, payload: undefined }, { onSuccess: () => onClose() })}
          loading={completeDelivery.isPending}
          fullWidth
        />
        <Button title={t('collectPayment.close')} variant="ghost" onPress={onClose} fullWidth />
      </View>
    );
  } else if (tab === 'cash') {
    footer = (
      <View className="gap-2">
        <Button
          title={t('collectPayment.confirmCash')}
          onPress={confirmCash}
          loading={collectCash.isPending}
          disabled={!cashConfirmed || dueAmount <= 0}
          fullWidth
        />
        <Button title={t('collectPayment.backToQr')} variant="ghost" onPress={() => setTab('qr')} fullWidth />
      </View>
    );
  } else if (qrDead || createError || loadError) {
    footer = (
      <View className="gap-2">
        <Button
          title={createError || loadError ? t('collectPayment.retry') : t('collectPayment.regenerate')}
          onPress={loadError ? () => statusQuery.refetch() : regenerate}
          loading={createQr.isPending}
          fullWidth
        />
        <Button title={t('collectPayment.qrNotWorking')} variant="outline" onPress={() => setTab('cash')} fullWidth />
      </View>
    );
  } else {
    footer = (
      <Button
        title={t('collectPayment.qrNotWorking')}
        variant="outline"
        onPress={() => setTab('cash')}
        fullWidth
      />
    );
  }

  // ------------------------------------------------------------------ body
  const tabButton = (value: Tab, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <Pressable
      onPress={() => setTab(value)}
      accessibilityRole="button"
      accessibilityState={{ selected: tab === value }}
      className="flex-1 py-3 rounded-xl border flex-row items-center justify-center gap-2"
      style={{
        borderColor: tab === value ? colors.primary : colors.border,
        backgroundColor: tab === value ? `${colors.primary}15` : colors.surface,
      }}
    >
      <Ionicons name={icon} size={18} color={tab === value ? colors.primary : colors.textSecondary} />
      <Text style={{ color: tab === value ? colors.primary : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );

  const renderBody = () => {
    if (isPaid) {
      return (
        <View className="items-center py-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${colors.success}20` }}
          >
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </View>
          <Text className="text-xl font-bold mb-1" style={{ color: colors.text }}>
            {t('collectPayment.paid')}
          </Text>
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.success }}>
            {formatRupees(status?.amount ?? 0)}
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
            {status?.method === 'cash' || cashRecorded ? t('collectPayment.paidCash') : t('collectPayment.paidBy')}
          </Text>
          <Text className="text-sm text-center mt-4 font-semibold" style={{ color: colors.text }}>
            {t('collectPayment.deliverHint')}
          </Text>
        </View>
      );
    }

    if (noBalance) {
      return (
        <View className="items-center py-8">
          <Ionicons name="information-circle-outline" size={40} color={colors.textMuted} />
          <Text className="text-sm text-center mt-3" style={{ color: colors.textSecondary }}>
            {t('collectPayment.noBalance')}
          </Text>
          <Text className="text-sm text-center mt-4 font-semibold" style={{ color: colors.text }}>
            {t('collectPayment.deliverHint')}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <View className="items-center mb-4">
          <Text className="text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>
            {t('collectPayment.amountDue')}
            {orderCode ? `  ·  ${orderCode}` : ''}
          </Text>
          <Text className="text-4xl font-bold mt-1" style={{ color: colors.text }}>
            {formatRupees(dueAmount)}
          </Text>
        </View>

        <View className="flex-row gap-3 mb-5">
          {tabButton('qr', t('collectPayment.qr'), 'qr-code-outline')}
          {tabButton('cash', t('collectPayment.cash'), 'cash-outline')}
        </View>

        {tab === 'cash' ? (
          <View className="rounded-2xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text className="text-base font-semibold mb-1" style={{ color: colors.text }}>
              {t('collectPayment.cashTitle')}
            </Text>
            <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {t('collectPayment.cashHint', { amount: formatRupees(dueAmount) })}
            </Text>
            <Pressable
              onPress={() => setCashConfirmed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cashConfirmed }}
              className="flex-row items-center gap-3"
            >
              <Ionicons
                name={cashConfirmed ? 'checkbox' : 'square-outline'}
                size={26}
                color={cashConfirmed ? colors.primary : colors.textMuted}
              />
              <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                {t('collectPayment.cashConfirmCheck', { amount: formatRupees(dueAmount) })}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="items-center">
            {creating ? (
              <View className="items-center justify-center" style={{ height: qrSize }}>
                <ActivityIndicator color={colors.primary} />
                <Text className="text-sm mt-3" style={{ color: colors.textSecondary }}>
                  {t('collectPayment.generating')}
                </Text>
              </View>
            ) : createError || loadError ? (
              <View className="items-center py-4">
                <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
                <Text className="text-base font-semibold mt-2" style={{ color: colors.text }}>
                  {t('collectPayment.qrFailed')}
                </Text>
                <Text className="text-sm text-center mt-1" style={{ color: colors.textSecondary }}>
                  {createError ?? loadError}
                </Text>
              </View>
            ) : qrDead ? (
              <View className="items-center py-4">
                <Ionicons name="time-outline" size={36} color={colors.warning} />
                <Text className="text-base font-semibold mt-2" style={{ color: colors.text }}>
                  {t('collectPayment.expired')}
                </Text>
              </View>
            ) : qrLive ? (
              <>
                <Text className="text-xs mb-3 text-center" style={{ color: colors.textSecondary }}>
                  {t('collectPayment.scanQrHint')}
                </Text>
                <View
                  className="rounded-2xl overflow-hidden border p-2"
                  style={{ borderColor: colors.border, backgroundColor: '#fff' }}
                >
                  {imageFailed ? (
                    <View className="items-center justify-center" style={{ width: qrSize, height: qrSize }}>
                      {/* Bug fix: tapping this used to just clear imageFailed
                          and re-render the exact same (already-broken)
                          qr_image_url, which would immediately error again -
                          a dead end with no way to actually get a working
                          QR. Regenerating asks the backend for a fresh QR
                          (new image_url), the actual fix for a bad/expired
                          image URL instead of retrying the same one. */}
                      <Pressable onPress={regenerate} hitSlop={8} disabled={createQr.isPending}>
                        {createQr.isPending ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="refresh" size={32} color={colors.primary} />
                        )}
                      </Pressable>
                      <Text className="text-xs mt-2 text-center" style={{ color: colors.textSecondary }}>
                        {t('collectPayment.qrLoadFailed')}
                      </Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: status?.qr_image_url ?? undefined }}
                      style={{ width: qrSize, height: qrSize }}
                      resizeMode="contain"
                      onError={() => setImageFailed(true)}
                      accessibilityLabel={t('collectPayment.scanToPay')}
                    />
                  )}
                </View>
                <View className="flex-row items-center gap-2 mt-4">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {t('collectPayment.waiting')}
                  </Text>
                </View>
                {secondsLeft !== null ? (
                  <Text className="text-xs mt-1" style={{ color: secondsLeft < 60 ? colors.error : colors.textMuted }}>
                    {t('collectPayment.expiresIn', { time: formatCountdown(secondsLeft) })}
                  </Text>
                ) : null}
                <Text className="text-xs mt-3 text-center" style={{ color: colors.textMuted }}>
                  {t('collectPayment.autoConfirm')}
                </Text>
              </>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('collectPayment.title')}
      contentKey={`${tab}-${state ?? 'loading'}`}
      footer={footer}
    >
      {renderBody()}
    </BottomSheet>
  );
};
