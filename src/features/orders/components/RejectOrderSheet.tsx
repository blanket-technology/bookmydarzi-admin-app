import { useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useRejectOrderMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';

export const RejectOrderSheet = ({
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
  const rejectMutation = useRejectOrderMutation();

  const handleReject = () => {
    rejectMutation.mutate(
      { orderId, payload: reason ? { reason } : undefined },
      { onSuccess: () => { onClose(); setReason(''); } },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('rejectOrder.title')}
      footer={
        <Button title={t('rejectOrder.title')} variant="danger" onPress={handleReject} loading={rejectMutation.isPending} fullWidth />
      }
    >
      <Input label={t('rejectOrder.reasonOptional')} value={reason} onChangeText={setReason} multiline />
    </BottomSheet>
  );
};
