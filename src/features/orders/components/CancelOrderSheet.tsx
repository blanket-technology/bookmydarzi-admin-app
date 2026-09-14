import { useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useCancelOrderMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';

export const CancelOrderSheet = ({
  visible,
  onClose,
  orderId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
}) => {
  const { t } = useAppLanguage();
  const [reason, setReason] = useState('');
  const cancelMutation = useCancelOrderMutation();

  const handleCancel = () => {
    if (!reason.trim()) return;
    cancelMutation.mutate(
      { orderId, payload: { reason } },
      { onSuccess: () => { onClose(); setReason(''); } },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('cancelOrder.title')}>
      <Input label={t('cancelOrder.reason')} value={reason} onChangeText={setReason} multiline />
      <Button title={t('cancelOrder.title')} variant="danger" onPress={handleCancel} loading={cancelMutation.isPending} disabled={!reason.trim()} fullWidth />
    </BottomSheet>
  );
};
