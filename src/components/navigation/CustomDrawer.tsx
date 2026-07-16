import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, DrawerItem } from '@/components/ui';
import type { AppPermissions } from '@/constants/permissions';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

type MenuPermissionKey = keyof AppPermissions;

const MENU_ITEMS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  permission: MenuPermissionKey;
}[] = [
  { label: 'Dashboard', icon: 'grid-outline', route: '/(drawer)/dashboard', permission: 'dashboard' },
  { label: 'Orders', icon: 'receipt-outline', route: '/(drawer)/orders', permission: 'orders' },
  { label: 'Customers', icon: 'people-outline', route: '/(drawer)/customers', permission: 'users' },
  { label: 'Tailors', icon: 'cut-outline', route: '/(drawer)/tailors', permission: 'tailors' },
  { label: 'Employees', icon: 'briefcase-outline', route: '/(drawer)/employees', permission: 'staff' },
  {
    label: 'Applications',
    icon: 'document-text-outline',
    route: '/(drawer)/applications',
    permission: 'applications',
  },
  {
    label: 'Measurements',
    icon: 'resize-outline',
    route: '/(drawer)/measurements',
    permission: 'measurements',
  },
  { label: 'Revenue', icon: 'trending-up-outline', route: '/(drawer)/revenue', permission: 'analytics' },
  {
    label: 'Notifications',
    icon: 'notifications-outline',
    route: '/(drawer)/notifications',
    permission: 'notifications',
  },
  { label: 'Settings', icon: 'settings-outline', route: '/(drawer)/settings', permission: 'settings' },
  { label: 'Profile', icon: 'person-outline', route: '/(drawer)/profile', permission: 'profile' },
];

export const CustomDrawer = (props: DrawerContentComponentProps) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const logoutMutation = useLogoutMutation();

  const visibleItems = MENU_ITEMS.filter((item) => permissions[item.permission]);

  const navigate = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as never);
  };

  return (
    <LinearGradient
      colors={['#2e1065', '#4c1d95', '#5b21b6']}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <View className="px-5 py-6 border-b border-white/10">
        <View className="flex-row items-center">
          <Avatar name={user?.full_name ?? user?.email} size={52} />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-lg" numberOfLines={1}>
              {user?.full_name ?? 'Admin'}
            </Text>
            <Text className="text-violet-200 text-sm capitalize" numberOfLines={1}>
              {user?.role ?? 'user'}
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row items-center bg-white/10 rounded-2xl px-3 py-2">
          <Ionicons name="cut" size={18} color="#fbbf24" />
          <Text className="text-white font-semibold ml-2">BookMyDarzi Admin</Text>
        </View>
      </View>

      <ScrollView className="flex-1 py-3" showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => (
          <DrawerItem
            key={item.route}
            label={item.label}
            icon={item.icon}
            active={pathname.includes(item.route.split('/').pop() ?? '')}
            onPress={() => navigate(item.route)}
          />
        ))}
      </ScrollView>

      <View className="px-3 pb-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <DrawerItem
          label="Logout"
          icon="log-out-outline"
          danger
          onPress={() => logoutMutation.mutate()}
        />
      </View>
    </LinearGradient>
  );
};
