import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const StaffInfoRow = ({
  label,
  value,
  last,
  capitalize,
}: {
  label: string;
  value: string;
  last?: boolean;
  capitalize?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row justify-between py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text className={`font-medium ${capitalize ? 'capitalize' : ''}`} style={{ color: colors.text }}>
        {value}
      </Text>
    </View>
  );
};
