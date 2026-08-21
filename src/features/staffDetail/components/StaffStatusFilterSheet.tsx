import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { BottomSheet, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { StaffOrderStatusOption } from '@/features/staffDetail/components/StaffOrdersTab';

interface StaffStatusFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  options: StaffOrderStatusOption[];
  value: string;
  onSelect: (value: string) => void;
}

export const StaffStatusFilterSheet = ({ visible, onClose, options, value, onSelect }: StaffStatusFilterSheetProps) => {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter by Status">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          className="flex-row items-center justify-between py-3 border-b"
          style={{ borderColor: colors.border }}
        >
          <Text style={{ color: colors.text }}>{opt.label}</Text>
          {opt.value === value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
        </Pressable>
      ))}
    </BottomSheet>
  );
};
