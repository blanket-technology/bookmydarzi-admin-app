import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

export const Header = ({
  title,
  subtitle,
  showMenu = true,
  rightAction,
}: HeaderProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Tablet/desktop show a permanent sidebar (see (drawer)/_layout), so a hamburger
  // that opens nothing would be a dead control.
  const { isTablet } = useResponsive();
  const showMenuButton = showMenu && !isTablet;

  return (
    <View
      className="px-5 pb-4 flex-row items-center justify-between"
      style={{ paddingTop: insets.top + 8, backgroundColor: colors.background }}
    >
      <View className="flex-row items-center flex-1">
        {showMenuButton ? (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            pressScale={0.92}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
          >
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction}
    </View>
  );
};
