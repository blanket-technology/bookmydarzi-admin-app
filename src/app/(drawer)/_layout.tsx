import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Loader } from '@/components/ui';
import { CustomDrawer } from '@/components/navigation/CustomDrawer';
import { RoutePermissionGuard } from '@/components/navigation/RoutePermissionGuard';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

export default function DrawerLayout() {
  const { isAuthenticated, isInitialized, isHydrated } = useAuth();
  const { colors } = useTheme();

  if (!isHydrated || !isInitialized) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <RoutePermissionGuard>
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            width: '82%',
            backgroundColor: colors.drawer,
          },
          overlayColor: colors.overlay,
          swipeEnabled: true,
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="orders/index" options={{ title: 'Orders' }} />
        <Drawer.Screen name="orders/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Drawer.Screen name="customers/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="tailors/index" options={{ title: 'Tailors' }} />
        <Drawer.Screen name="tailors/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="employees/index" options={{ title: 'Employees' }} />
        <Drawer.Screen name="employees/add" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="employees/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="applications/index" options={{ title: 'Applications' }} />
        <Drawer.Screen name="applications/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="measurements" options={{ title: 'Measurements' }} />
        <Drawer.Screen name="revenue" options={{ title: 'Revenue' }} />
        <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
        <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      </Drawer>
    </RoutePermissionGuard>
  );
}
