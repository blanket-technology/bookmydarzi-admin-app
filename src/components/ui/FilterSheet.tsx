import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const FilterSheet = ({
  visible,
  onClose,
  title = 'Filter',
  options,
  selectedValue,
  onSelect,
}: FilterSheetProps) => {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {options.map((option) => {
        const selected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
            haptic="selection"
            className="flex-row items-center justify-between py-3.5 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text
              className="text-base"
              style={{ color: selected ? colors.primary : colors.text }}
            >
              {option.label}
            </Text>
            {selected ? (
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            ) : null}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
};
