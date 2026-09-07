import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

/**
 * Inline "accept this offer" card shown on an order's own detail screen when
 * the current employee has a pending pickup/delivery broadcast offer for
 * THIS specific order (FCFS - matches the broadcast targeting). Employee
 * role only - extracted unchanged from orders/[id].tsx.
 */
export const PendingOfferCard = ({
  isPickup,
  onAccept,
  accepting,
}: {
  isPickup: boolean;
  onAccept: () => void;
  accepting: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Card className="mb-4" style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <View className="flex-row items-center mb-2">
        <Ionicons name={isPickup ? 'cube-outline' : 'bicycle-outline'} size={18} color={colors.primary} />
        <Text className="font-bold ml-2" style={{ color: colors.text }}>
          {isPickup ? 'Pickup offer for you' : 'Delivery offer for you'}
        </Text>
      </View>
      <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
        You have a pending {isPickup ? 'pickup' : 'delivery'} offer for this order. Accept to claim it
        (first come, first served).
      </Text>
      <Pressable
        onPress={onAccept}
        disabled={accepting}
        className="rounded-xl py-3 items-center"
        style={{ backgroundColor: colors.primary, opacity: accepting ? 0.6 : 1 }}
      >
        <Text className="text-white font-semibold">
          {accepting ? 'Accepting…' : isPickup ? 'Accept Pickup' : 'Accept Delivery'}
        </Text>
      </Pressable>
    </Card>
  );
};
