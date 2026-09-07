import { useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useRejectOrderMutation } from '@/features/orders/hooks/useOrders';

export const RejectOrderSheet = ({
  visible,
  onClose,
  orderId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
}) => {
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectOrderMutation();

  const handleReject = () => {
    rejectMutation.mutate(
      { orderId, payload: reason ? { reason } : undefined },
      { onSuccess: () => { onClose(); setReason(''); } },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reject Order">
      <Input label="Reason (optional)" value={reason} onChangeText={setReason} multiline />
      <Button title="Reject Order" variant="danger" onPress={handleReject} loading={rejectMutation.isPending} fullWidth />
    </BottomSheet>
  );
};
