import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search...',
}: SearchBarProps) => {
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-center rounded-2xl px-4 py-3 mb-4 border"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="flex-1 ml-3 text-base"
        style={{ color: colors.text }}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};
