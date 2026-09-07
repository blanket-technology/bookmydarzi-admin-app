import { useEffect, useState } from 'react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { useUpdateOrderNotesMutation } from '@/features/orders/hooks/useOrders';
import type { AdminOrderItem } from '@/types/orders';

/** Admin-only order-notes editor. Seeds its form from `order` every time it
 * opens (not on every render) so a stale edit from a previous open never
 * lingers. Extracted unchanged from orders/[id].tsx. */
export const OrderNotesEditSheet = ({
  visible,
  onClose,
  order,
}: {
  visible: boolean;
  onClose: () => void;
  order: AdminOrderItem;
}) => {
  const [form, setForm] = useState({
    description: '',
    fabric_notes: '',
    customization_notes: '',
    cloth_details: '',
  });
  const updateNotesMutation = useUpdateOrderNotesMutation();

  useEffect(() => {
    if (!visible) return;
    setForm({
      description: order.description ?? '',
      fabric_notes: order.fabric_notes ?? '',
      customization_notes: order.customization_notes ?? '',
      cloth_details: order.cloth_details ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = () => {
    updateNotesMutation.mutate(
      {
        orderId: order.order_id,
        payload: {
          description: form.description || null,
          fabric_notes: form.fabric_notes || null,
          customization_notes: form.customization_notes || null,
          cloth_details: form.cloth_details || null,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Order Notes">
      <Input label="Description" value={form.description} onChangeText={(text) => setForm((f) => ({ ...f, description: text }))} multiline />
      <Input label="Fabric Notes" value={form.fabric_notes} onChangeText={(text) => setForm((f) => ({ ...f, fabric_notes: text }))} multiline />
      <Input
        label="Customization Notes"
        value={form.customization_notes}
        onChangeText={(text) => setForm((f) => ({ ...f, customization_notes: text }))}
        multiline
      />
      <Input label="Cloth Details" value={form.cloth_details} onChangeText={(text) => setForm((f) => ({ ...f, cloth_details: text }))} multiline />
      <Button title="Save Notes" onPress={handleSave} loading={updateNotesMutation.isPending} fullWidth />
    </BottomSheet>
  );
};
