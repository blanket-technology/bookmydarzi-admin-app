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
  /** Show a back arrow - for a drawer-level screen that's also commonly
   * reached by navigating INTO it (e.g. Orders, Customers, Support,
   * opened from a dashboard shortcut, a push notification, or drilling in
   * from another screen) rather than only via the drawer itself. Falls
   * back to the dashboard if there's no screen to go back to (e.g. this
   * was the first screen after a cold-start deep link).
   *
   * When the screen is ALSO a real drawer menu item, pass showMenu (the
   * default) alongside it so both controls render together - router.
   * canGoBack() is not a reliable way to tell "came from the drawer" apart
   * from "came from a drill-in" in an Expo Router + Drawer setup (a
   * documented, version-dependent quirk - github.com/expo/expo/issues/38536),
   * so rather than guess wrong in either direction, a dual-purpose screen
   * just gets both the back arrow and the hamburger button, always
   * correct regardless of how the user arrived. Pass showMenu={false}
   * explicitly only for a screen that's genuinely never reached from the
   * drawer (e.g. a true sub-screen with no drawer entry at all). */
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
  const showMenuButton = showMenu && !isTablet;

  const iconButtonStyle = {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  };

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
            style={[iconButtonStyle, { marginRight: showBack && showMenuButton ? 8 : 12 }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        ) : null}
        {showMenuButton ? (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            pressScale={0.92}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            style={[iconButtonStyle, { marginRight: 12 }]}
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
