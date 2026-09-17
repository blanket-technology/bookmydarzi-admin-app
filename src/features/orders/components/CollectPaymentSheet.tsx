import { useEffect, useState } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { BottomSheet, Button, Input, Pressable } from '@/components/ui';
import { useCollectPaymentMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';

// Same merchant UPI VPA the customer app's balance-payment QR uses
// (EXPO_PUBLIC_MERCHANT_UPI_ID in react_app/eas.json) - both apps' QR
// collections land in the same account. No QR library needed: a public
// QR-image-generation API renders the PNG directly from the UPI deep link.
const MERCHANT_UPI = process.env.EXPO_PUBLIC_MERCHANT_UPI_ID ?? 'blankettechnolo974972.rzp@raxis';

function buildUpiQrImageUri(upiId: string, amount: number, orderCode: string, qrSize: number): string {
  const upiLink =
    `upi://pay?pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent('BookMyDarzi')}` +
    `&tr=${encodeURIComponent(orderCode)}` +
    `&am=${amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(`COD collection for order ${orderCode}`)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=12&data=${encodeURIComponent(upiLink)}`;
}

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
  /** The order's actual balance due, from the backend - pre-fills the
   * amount field so the delivery person confirms/edits a known-correct
   * number instead of typing one from scratch (matches how Blinkit/other
   * delivery apps prefill COD collection - manual blank entry risks typos
   * with no source-of-truth check until the backend rejects it after the
   * fact). Still editable, since a genuine partial collection can happen. */
  remainingAmount?: number | null;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [method, setMethod] = useState<'qr' | 'cash'>('cash');
  const [amount, setAmount] = useState('');
  const collectPaymentMutation = useCollectPaymentMutation();

  // Re-prefill whenever the sheet opens (or the balance changes while it's
  // open, e.g. an add-on was just added) rather than only on mount - a
  // stale blank/previous value must never linger across opens.
  useEffect(() => {
    if (visible && remainingAmount && remainingAmount > 0) {
      setAmount(String(remainingAmount));
    }
  }, [visible, remainingAmount]);

  const handleCollect = () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    collectPaymentMutation.mutate(
      { orderId, payload: { method, amount: numAmount } },
      { onSuccess: () => { onClose(); setAmount(''); } },
    );
  };

  // QR size previously scaled off raw screenWidth alone (up to 240px) with
  // no ceiling tied to the sheet's own available height - on a short/small
  // device (older phones, split-screen, landscape) the QR block plus the
  // cash/QR toggle, amount input and confirm button together could exceed
  // the sheet's maxHeight, forcing a scroll that made the Confirm button
  // (previously mixed into the same scrollable content) hard to reach or
  // invisible below the fold. Two fixes: cap QR size more conservatively
  // against both screen dimensions, and move Confirm into BottomSheet's
  // dedicated `footer` slot (always pinned, outside the scroll area) - see
  // BottomSheet.tsx's own `footer` prop doc for exactly this scenario.
  const qrSize = Math.min(screenWidth - 96, screenHeight * 0.28, 220);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('collectPayment.title')}
      footer={
        <Button
          title={t('collectPayment.confirmCollection')}
          onPress={handleCollect}
          loading={collectPaymentMutation.isPending}
          disabled={!amount || Number(amount) <= 0}
          fullWidth
        />
      }
    >
      <View className="flex-row gap-3 mb-4">
        <Pressable
          onPress={() => setMethod('cash')}
          className="flex-1 py-3 rounded-xl border items-center"
          style={{
            borderColor: method === 'cash' ? colors.primary : colors.border,
            backgroundColor: method === 'cash' ? `${colors.primary}15` : colors.surface,
          }}
        >
          <Text style={{ color: colors.text }}>{t('collectPayment.cash')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setMethod('qr')}
          className="flex-1 py-3 rounded-xl border items-center"
          style={{
            borderColor: method === 'qr' ? colors.primary : colors.border,
            backgroundColor: method === 'qr' ? `${colors.primary}15` : colors.surface,
          }}
        >
          <Text style={{ color: colors.text }}>{t('collectPayment.qr')}</Text>
        </Pressable>
      </View>
      <Input label={t('collectPayment.amountCollected')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      {method === 'qr' ? (
        Number(amount) > 0 ? (
          <View className="items-center mb-4">
            <Text className="text-xs mb-2 text-center" style={{ color: colors.textSecondary }}>
              {t('collectPayment.scanQrHint')}
            </Text>
            <View className="rounded-2xl overflow-hidden border p-2" style={{ borderColor: colors.border, backgroundColor: '#fff' }}>
              <Image
                source={{
                  uri: buildUpiQrImageUri(MERCHANT_UPI, Number(amount), orderCode ?? orderId, qrSize),
                }}
                style={{ width: qrSize, height: qrSize }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
              {MERCHANT_UPI}
            </Text>
          </View>
        ) : (
          <Text className="text-xs mb-4" style={{ color: colors.textMuted }}>
            {t('collectPayment.enterAmountHint')}
          </Text>
        )
      ) : null}
    </BottomSheet>
  );
};
