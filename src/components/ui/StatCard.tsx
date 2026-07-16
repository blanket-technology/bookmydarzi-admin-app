import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: string;
}

export const StatCard = ({ title, value, icon, color, trend }: StatCardProps) => {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;

  return (
    <Card className="flex-1 min-w-[46%] mb-3">
      <View className="flex-row items-start justify-between">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: `${accent}20` }}
        >
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        {trend ? (
          <Text className="text-xs font-medium" style={{ color: colors.success }}>
            {trend}
          </Text>
        ) : null}
      </View>
      <Text
        className="text-2xl font-bold mt-3"
        style={{ color: colors.text }}
      >
        {value}
      </Text>
      <Text
        className="text-sm mt-1"
        style={{ color: colors.textSecondary }}
      >
        {title}
      </Text>
    </Card>
  );
};
