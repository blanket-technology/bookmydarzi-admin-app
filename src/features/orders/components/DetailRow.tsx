import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const DetailRow = ({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  valueColor?: string;
}) => (
  <View className="flex-row justify-between py-2.5 border-b" style={{ borderColor: colors.border }}>
    <Text className="text-sm" style={{ color: colors.textSecondary }}>
      {label}
    </Text>
    <Text className="text-sm font-medium flex-1 text-right ml-4" style={{ color: valueColor ?? colors.text }}>
      {value}
    </Text>
  </View>
);
