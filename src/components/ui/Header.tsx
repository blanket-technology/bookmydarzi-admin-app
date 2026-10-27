import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { router, useNavigation } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showMenu?: boolean;
  /** Show a back arrow instead of the hamburger menu icon - for a
   * drawer-level screen that's still commonly reached by navigating INTO
   * it (e.g. Support, opened from a dashboard shortcut or a push
   * notification) rather than only via the drawer itself. Falls back to
   * the dashboard if there's no screen to go back to (e.g. this was the
   * first screen after a cold-start deep link). */
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header = ({
  title,
  subtitle,
  showMenu = true,
  showBack = false,
  rightAction,
}: HeaderProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Tablet/desktop show a permanent sidebar (see (drawer)/_layout), so a hamburger
  // that opens nothing would be a dead control.
  const { isTablet } = useResponsive();
  const showMenuButton = !showBack && showMenu && !isTablet;

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: insets.top + 8,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(drawer)/dashboard'))}
            pressScale={0.92}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        ) : showMenuButton ? (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            pressScale={0.92}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 14, marginTop: 2, color: colors.textSecondary }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction}
    </View>
  );
};
