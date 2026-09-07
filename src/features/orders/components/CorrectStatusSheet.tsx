import { Text } from 'react-native';
import { BottomSheet, Pressable } from '@/components/ui';
import { ADMIN_CORRECTABLE_STATUS_OPTIONS } from '@/constants/orderStatus';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';

export const CorrectStatusSheet = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (status: OrderStatus) => void;
}) => {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Correct Status">
      {ADMIN_CORRECTABLE_STATUS_OPTIONS.map((option) => (
        <Pressable key={option.value} onPress={() => onSelect(option.value)} className="py-3 border-b" style={{ borderColor: colors.border }}>
          <Text style={{ color: colors.text }}>{option.label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
};
