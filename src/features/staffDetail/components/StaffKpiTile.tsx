import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const StaffKpiTile = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      className="rounded-2xl p-3 items-center justify-center border"
      style={{ backgroundColor: colors.card, borderColor: colors.border, minWidth: '30%', flexGrow: 1 }}
    >
      <Text className="text-lg font-bold" style={{ color: accent ?? colors.text }}>
        {value}
      </Text>
      <Text className="text-[10px] text-center mt-0.5" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
};
