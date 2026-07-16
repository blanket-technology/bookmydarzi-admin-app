import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface DrawerItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  danger?: boolean;
}

export const DrawerItem = ({
  label,
  icon,
  active = false,
  onPress,
  danger = false,
}: DrawerItemProps) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 mx-3 rounded-2xl mb-1"
      style={{
        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
      }}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{
          backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? '#fca5a5' : active ? '#ffffff' : colors.drawerText}
        />
      </View>
      <Text
        className="text-base font-medium flex-1"
        style={{ color: danger ? '#fca5a5' : active ? '#ffffff' : colors.drawerText }}
      >
        {label}
      </Text>
      {active ? (
        <View className="w-1.5 h-6 rounded-full bg-accent-400" />
      ) : null}
    </Pressable>
  );
};
