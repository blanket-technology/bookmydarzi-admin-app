import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface DrawerItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  danger?: boolean;
  badgeCount?: number;
}

export const DrawerItem = ({
  label,
  icon,
  active = false,
  onPress,
  danger = false,
  badgeCount,
}: DrawerItemProps) => {
  const { colors } = useTheme();

  const contentColor = danger ? '#dc2626' : active ? colors.primary : colors.text;

  return (
    <Pressable
      onPress={onPress}
      pressScale={0.98}
      haptic="selection"
      className="flex-row items-center px-4 py-3.5 mx-3 rounded-2xl mb-1"
      style={{
        backgroundColor: active ? colors.primaryLight : 'transparent',
      }}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{
          backgroundColor: active ? colors.card : 'transparent',
        }}
      >
        <Ionicons name={icon} size={20} color={contentColor} />
      </View>
      <Text className="text-base font-medium flex-1" style={{ color: contentColor }}>
        {label}
      </Text>
      {badgeCount && badgeCount > 0 ? (
        <View
          className="min-w-[20px] h-5 rounded-full items-center justify-center px-1.5 mr-1"
          style={{ backgroundColor: '#ef4444' }}
        >
          <Text className="text-white text-xs font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      ) : null}
      {active ? (
        <View className="w-1.5 h-6 rounded-full" style={{ backgroundColor: colors.primary }} />
      ) : null}
    </Pressable>
  );
};
