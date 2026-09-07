import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { DetailRow } from './DetailRow';

/** Order notes card - visible to every role once any note exists, or always
 * for admin (who can add the first one). Extracted unchanged from
 * orders/[id].tsx; the edit sheet itself stays in the parent screen since it
 * owns its own form state. */
export const OrderNotesCard = ({
  order,
  isAdminRole,
  onEdit,
}: {
  order: AdminOrderItem;
  isAdminRole: boolean;
  onEdit: () => void;
}) => {
  const { colors } = useTheme();
  const hasOrderNotes = !!(order.description || order.fabric_notes || order.customization_notes || order.cloth_details);

  if (!hasOrderNotes && !isAdminRole) return null;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-bold" style={{ color: colors.text }}>
          Order Notes
        </Text>
        {isAdminRole ? (
          <Pressable onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {hasOrderNotes ? (
        <>
          {order.description ? <DetailRow label="Description" value={order.description} colors={colors} /> : null}
          {order.fabric_notes ? <DetailRow label="Fabric Notes" value={order.fabric_notes} colors={colors} /> : null}
          {order.customization_notes ? (
            <DetailRow label="Customization" value={order.customization_notes} colors={colors} />
          ) : null}
          {order.cloth_details ? <DetailRow label="Cloth Details" value={order.cloth_details} colors={colors} /> : null}
        </>
      ) : (
        <Text className="text-sm py-1" style={{ color: colors.textMuted }}>
          No notes added yet.
        </Text>
      )}
    </Card>
  );
};
