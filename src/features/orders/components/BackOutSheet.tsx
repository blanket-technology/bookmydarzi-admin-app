import { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Input, Pressable } from '@/components/ui';
import { BACKOUT_REASON_CODES, BACKOUT_REASON_LABEL_KEYS, type BackoutReasonCode } from '@/constants/backoutReason';
import { useAppLanguage } from '@/hooks/useAppLanguage';

/**
 * Shared across all 5 Bridge legs (pickup, delivery, return, repair-pickup,
 * repair-delivery) - a partner who already accepted a leg but genuinely
 * can't complete it (vehicle breakdown, blocked road, can't reach the
 * location). Two steps: pick a structured reason (free text required only
 * for "Other"), then a mandatory confirm screen - this reverts an
 * already-accepted assignment and immediately re-broadcasts it to someone
 * else, so it isn't a single accidental tap.
 */
export const BackOutSheet = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason_code: BackoutReasonCode; reason_text?: string }) => void;
  isSubmitting: boolean;
}) => {
  const { t } = useAppLanguage();
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [reasonCode, setReasonCode] = useState<BackoutReasonCode | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [textError, setTextError] = useState(false);

  const reset = () => {
    setStep('reason');
    setReasonCode(null);
    setReasonText('');
    setTextError(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleContinue = () => {
    if (!reasonCode) return;
    if (reasonCode === 'other' && !reasonText.trim()) {
      setTextError(true);
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!reasonCode) return;
    onSubmit({
      reason_code: reasonCode,
      reason_text: reasonCode === 'other' ? reasonText.trim() : undefined,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={step === 'reason' ? t('backOutSheet.title') : t('backOutSheet.confirmTitle')}
      contentKey={step}
      footer={
        step === 'reason' ? (
          <Button
            title={t('backOutSheet.continue')}
            variant="danger"
            onPress={handleContinue}
            disabled={!reasonCode}
            fullWidth
          />
        ) : (
          <Button
            title={t('backOutSheet.confirmButton')}
            variant="danger"
            onPress={handleConfirm}
            loading={isSubmitting}
            fullWidth
          />
        )
      }
    >
      {step === 'reason' ? (
        <View>
          <Text className="text-sm text-slate-500 mb-4">{t('backOutSheet.subtitle')}</Text>
          <Text className="text-sm font-medium text-slate-500 mb-2">{t('backOutSheet.reasonLabel')}</Text>
          <View className="gap-2 mb-4">
            {BACKOUT_REASON_CODES.map((code) => {
              const selected = reasonCode === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    setReasonCode(code);
                    setTextError(false);
                  }}
                  haptic="selection"
                  className={`py-3 px-4 rounded-2xl border ${
                    selected ? 'bg-primary-50 border-primary-600' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-primary-700' : 'text-slate-700'}`}>
                    {t(`backOutSheet.reasons.${BACKOUT_REASON_LABEL_KEYS[code]}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {reasonCode === 'other' ? (
            <Input
              label={t('backOutSheet.reasonTextLabel')}
              value={reasonText}
              onChangeText={(v) => {
                setReasonText(v);
                setTextError(false);
              }}
              multiline
              error={textError ? t('backOutSheet.reasonTextRequired') : undefined}
            />
          ) : null}
        </View>
      ) : (
        <Text className="text-sm text-slate-600">{t('backOutSheet.confirmBody')}</Text>
      )}
    </BottomSheet>
  );
};
