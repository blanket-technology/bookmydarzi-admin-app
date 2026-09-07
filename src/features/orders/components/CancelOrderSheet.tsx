import { useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useCancelOrderMutation } from '@/features/orders/hooks/useOrders';

export const CancelOrderSheet = ({
  visible,
  onClose,
  orderId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
}) => {
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
    <BottomSheet visible={visible} onClose={onClose} title="Cancel Order">
      <Input label="Reason" value={reason} onChangeText={setReason} multiline />
      <Button title="Cancel Order" variant="danger" onPress={handleCancel} loading={cancelMutation.isPending} disabled={!reason.trim()} fullWidth />
    </BottomSheet>
  );
};
