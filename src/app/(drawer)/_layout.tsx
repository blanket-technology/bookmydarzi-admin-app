import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Loader } from '@/components/ui';
import { BiometricLockGate } from '@/components/navigation/BiometricLockGate';
import { CustomDrawer } from '@/components/navigation/CustomDrawer';
import { RoutePermissionGuard } from '@/components/navigation/RoutePermissionGuard';
import { useAuth } from '@/hooks/useAuth';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

export default function DrawerLayout() {
  const { isAuthenticated, isInitialized, isHydrated } = useAuth();
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  usePushRegistration();

  if (!isHydrated || !isInitialized) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <BiometricLockGate>
      <RoutePermissionGuard>
        <Drawer
          drawerContent={(props) => <CustomDrawer {...props} />}
          screenOptions={{
            headerShown: false,
            // Tablet/desktop-web gets a permanent sidebar (no overlay/swipe,
            // always visible) instead of the phone overlay drawer - the
            // extra width has room for it, and an overlay that covers half
            // a tablet screen just to show 6 nav items is wasted space.
            drawerType: isTablet ? 'permanent' : 'front',
            drawerStyle: {
              width: isTablet ? 300 : '82%',
              backgroundColor: colors.drawer,
            },
            overlayColor: colors.overlay,
            swipeEnabled: !isTablet,
          }}
        >
          <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
          <Drawer.Screen name="orders" options={{ title: 'Orders' }} />
          <Drawer.Screen name="reviews/index" options={{ title: 'Reviews' }} />
          <Drawer.Screen name="payments/index" options={{ title: 'Payments' }} />
          <Drawer.Screen name="broadcasts/index" options={{ title: 'Broadcasts' }} />
          <Drawer.Screen name="pickups/index" options={{ title: 'Pickups' }} />
          <Drawer.Screen name="deliveries/index" options={{ title: 'Deliveries' }} />
          <Drawer.Screen name="leave/index" options={{ title: 'Leave' }} />
          <Drawer.Screen name="customers" options={{ title: 'Customers' }} />
          <Drawer.Screen name="tailors" options={{ title: 'Tailors' }} />
          <Drawer.Screen name="employees" options={{ title: 'Bridge' }} />
          <Drawer.Screen name="admins" options={{ title: 'Admins' }} />
          <Drawer.Screen name="cancellations" options={{ title: 'Cancellations' }} />
          <Drawer.Screen name="applications" options={{ title: 'Tailor Applications' }} />
          <Drawer.Screen name="revenue" options={{ title: 'Revenue' }} />
          <Drawer.Screen name="catalog/index" options={{ title: 'Catalog' }} />
          <Drawer.Screen name="homepage/index" options={{ title: 'Homepage' }} />
          <Drawer.Screen name="inventory/index" options={{ title: 'Inventory' }} />
          <Drawer.Screen name="lookbook/index" options={{ title: 'Lookbook' }} />
          <Drawer.Screen name="offers/index" options={{ title: 'Offers & Coupons' }} />
          <Drawer.Screen name="service-areas/index" options={{ title: 'Service Areas' }} />
          <Drawer.Screen name="audit-log/index" options={{ title: 'Audit Log' }} />
          <Drawer.Screen name="roles-permissions/index" options={{ title: 'Roles & Permissions' }} />
          <Drawer.Screen name="faqs/index" options={{ title: 'FAQs' }} />
          <Drawer.Screen name="billing/index" options={{ title: 'Billing' }} />
          <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Drawer.Screen name="support" options={{ title: 'Support' }} />
          <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
          <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
        </Drawer>
      </RoutePermissionGuard>
    </BiometricLockGate>
  );
}
