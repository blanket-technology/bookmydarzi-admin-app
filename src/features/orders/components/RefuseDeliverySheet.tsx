import { useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useRefuseDeliveryMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';

// Reason is REQUIRED here (unlike RejectOrderSheet's optional one) - the
// backend (cancellation_service.py's refuse_delivery) rejects an empty
// reason outright, since this is a real customer-facing event shown in
// their order timeline, not a routine status flip.
export const RefuseDeliverySheet = ({
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
  const refuseMutation = useRefuseDeliveryMutation();

  const handleRefuse = () => {
    if (!reason.trim()) return;
    refuseMutation.mutate(
      { orderId, payload: reason.trim() },
      { onSuccess: () => { onClose(); setReason(''); } },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('refuseDelivery.title')}
      footer={
        <Button
          title={t('refuseDelivery.title')}
          variant="danger"
          onPress={handleRefuse}
          loading={refuseMutation.isPending}
          disabled={!reason.trim()}
          fullWidth
        />
      }
    >
      <Input
        label={t('refuseDelivery.reasonRequired')}
        value={reason}
        onChangeText={setReason}
        multiline
      />
    </BottomSheet>
  );
};
