import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: string;
  /** Optional — when provided, the whole card becomes tappable (e.g. drill
   * into the relevant list screen) and shows a chevron affordance. Omit for
   * a purely informational stat with no meaningful destination (e.g.
   * revenue, which has no dedicated screen on mobile). */
  onPress?: () => void;
}

export const StatCard = ({ title, value, icon, color, trend, onPress }: StatCardProps) => {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;

  const content = (
    <>
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
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} pressScale={0.97} className="mb-3 grow basis-[45%] md:basis-[30%] lg:basis-[22%]">
        <Card>{content}</Card>
      </Pressable>
    );
  }

  return (
    <Card
      className="mb-3 grow basis-[45%] md:basis-[30%] lg:basis-[22%]"
    >
      {content}
    </Card>
  );
};
