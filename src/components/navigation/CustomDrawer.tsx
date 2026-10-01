import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { router, usePathname } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, DrawerItem } from '@/components/ui';
import type { AppPermissions } from '@/constants/permissions';
import { useBroadcastOffers } from '@/features/broadcasts/hooks/useBroadcasts';
import { useDeliveryBroadcastOffers } from '@/features/deliveries/hooks/useDeliveries';
import { usePickupBroadcastOffers } from '@/features/pickups/hooks/usePickups';
import { useReturnBroadcastOffers } from '@/features/returns/hooks/useReturns';
import { useRepairPickupBroadcastOffers } from '@/features/repairPickups/hooks/useRepairPickups';
import { useRepairDeliveryBroadcastOffers } from '@/features/repairDeliveries/hooks/useRepairDeliveries';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications';
import { usePendingChatCount } from '@/features/chat/hooks/useChat';
import { useSupportTickets } from '@/features/support/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

type MenuPermissionKey = keyof AppPermissions;

const MENU_ITEMS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  permission: MenuPermissionKey;
}[] = [
  { label: 'Dashboard', icon: 'grid-outline', route: '/(drawer)/dashboard', permission: 'dashboard' },
  { label: 'Orders', icon: 'receipt-outline', route: '/(drawer)/orders', permission: 'orders' },
  { label: 'Reviews', icon: 'star-outline', route: '/(drawer)/reviews', permission: 'orders' },
  { label: 'Payments', icon: 'wallet-outline', route: '/(drawer)/payments', permission: 'payments' },
  { label: 'Broadcasts', icon: 'radio-outline', route: '/(drawer)/broadcasts', permission: 'broadcasts' },
  { label: 'Pickups', icon: 'cube-outline', route: '/(drawer)/pickups', permission: 'deliveries' },
  { label: 'Deliveries', icon: 'bicycle-outline', route: '/(drawer)/deliveries', permission: 'deliveries' },
  { label: 'Returns', icon: 'return-up-back-outline', route: '/(drawer)/returns', permission: 'deliveries' },
  { label: 'Repair Pickups', icon: 'construct-outline', route: '/(drawer)/repair-pickups', permission: 'deliveries' },
  { label: 'Repair Deliveries', icon: 'build-outline', route: '/(drawer)/repair-deliveries', permission: 'deliveries' },
  { label: 'Leave', icon: 'calendar-outline', route: '/(drawer)/leave', permission: 'leave' },
  { label: 'Customers', icon: 'people-outline', route: '/(drawer)/customers', permission: 'users' },
  { label: 'Tailors', icon: 'cut-outline', route: '/(drawer)/tailors', permission: 'tailors' },
  {
    label: 'Applications',
    icon: 'document-text-outline',
    route: '/(drawer)/applications',
    permission: 'applications',
  },
  { label: 'Bridge', icon: 'briefcase-outline', route: '/(drawer)/employees', permission: 'staff' },
  { label: 'Admins', icon: 'shield-checkmark-outline', route: '/(drawer)/admins', permission: 'adminManagement' },
  { label: 'Cancellations', icon: 'close-circle-outline', route: '/(drawer)/cancellations', permission: 'cancellations' },
  { label: 'Revenue', icon: 'trending-up-outline', route: '/(drawer)/revenue', permission: 'analytics' },
  { label: 'Catalog', icon: 'pricetags-outline', route: '/(drawer)/catalog', permission: 'catalog' },
  { label: 'Inventory', icon: 'cube-outline', route: '/(drawer)/inventory', permission: 'inventory' },
  { label: 'Lookbook', icon: 'images-outline', route: '/(drawer)/lookbook', permission: 'lookbook' },
  { label: 'Homepage', icon: 'phone-portrait-outline', route: '/(drawer)/homepage', permission: 'homepage' },
  { label: 'Offers & Coupons', icon: 'pricetag-outline', route: '/(drawer)/offers', permission: 'offers' },
  { label: 'Service Areas', icon: 'map-outline', route: '/(drawer)/service-areas', permission: 'serviceAreas' },
  { label: 'Audit Log', icon: 'time-outline', route: '/(drawer)/audit-log', permission: 'auditLog' },
  {
    label: 'Roles & Permissions',
    icon: 'shield-outline',
    route: '/(drawer)/roles-permissions',
    permission: 'rolesPermissions',
  },
  { label: 'FAQs', icon: 'help-circle-outline', route: '/(drawer)/faqs', permission: 'faqs' },
  { label: 'Billing', icon: 'card-outline', route: '/(drawer)/billing', permission: 'billing' },
  { label: 'Tailor Payouts', icon: 'wallet-outline', route: '/(drawer)/payouts', permission: 'payouts' },
  {
    label: 'Notifications',
    icon: 'notifications-outline',
    route: '/(drawer)/notifications',
    permission: 'notifications',
  },
  {
    label: 'Support',
    icon: 'help-buoy-outline',
    route: '/(drawer)/support',
    permission: 'supportTickets',
  },
  { label: 'Settings', icon: 'settings-outline', route: '/(drawer)/settings', permission: 'settings' },
  { label: 'Profile', icon: 'person-outline', route: '/(drawer)/profile', permission: 'profile' },
];

export const CustomDrawer = (props: DrawerContentComponentProps) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const { user, isAuthenticated } = useAuth();
  const { permissions } = usePermissions();
  const logoutMutation = useLogoutMutation();
  const { data: unreadCount } = useUnreadNotificationCount(
    isAuthenticated && permissions.notifications,
  );
  const { data: pendingChatCount } = usePendingChatCount(isAuthenticated && permissions.chat);
  // Support's badge combines both underlying systems merged into that one
  // screen (chat_v2 sessions awaiting an agent, plus open tickets) so the
  // drawer count matches what the merged inbox actually shows.
  const { data: openTicketsData } = useSupportTickets(
    { status: 'open', limit: 1 },
    isAuthenticated && permissions.supportTickets,
  );
  const supportBadgeCount = (pendingChatCount ?? 0) + (openTicketsData?.total ?? 0);
  const { data: broadcastsData } = useBroadcastOffers(
    { limit: 1 },
    isAuthenticated && permissions.broadcasts,
  );
  const { data: deliveryBroadcastsData } = useDeliveryBroadcastOffers(
    isAuthenticated && permissions.deliveries,
  );
  const { data: pickupBroadcastsData } = usePickupBroadcastOffers(
    isAuthenticated && permissions.deliveries,
  );
  const { data: returnBroadcastsData } = useReturnBroadcastOffers(
    isAuthenticated && permissions.deliveries,
  );
  const { data: repairPickupBroadcastsData } = useRepairPickupBroadcastOffers(
    isAuthenticated && permissions.deliveries,
  );
  const { data: repairDeliveryBroadcastsData } = useRepairDeliveryBroadcastOffers(
    isAuthenticated && permissions.deliveries,
  );

  const visibleItems = MENU_ITEMS.filter((item) => permissions[item.permission]);

  const navigate = (route: string) => {
    // drawerType: 'permanent' (tablet/desktop-web, _layout.tsx) has no
    // closeable overlay - CLOSE_DRAWER has no navigator to dispatch to.
    // Navigation's dispatch() never throws for an unhandled action (see
    // @react-navigation/core's useNavigationHelpers.dispatch - it calls
    // onUnhandledAction via console.error, it does not throw) so a
    // try/catch here can never actually catch anything; that was a no-op
    // fix. The navigation itself (router.push below) always succeeds
    // regardless - this LogBox warning is purely cosmetic dev-mode noise,
    // not a real failure, but it was covering the whole screen and reading
    // as "the screen didn't open." Just don't call closeDrawer() at all
    // unless there's an overlay to actually close.
    if (!isTablet) {
      props.navigation.closeDrawer();
    }
    router.push(route as never);
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.drawer }}>
      <View className="px-5 py-6 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <Avatar name={user?.full_name ?? user?.email} size={52} />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-lg" style={{ color: colors.drawerText }} numberOfLines={1}>
              {user?.full_name ?? 'Admin'}
            </Text>
            <Text className="text-sm capitalize" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {user?.role ?? 'user'}
            </Text>
          </View>
        </View>
        <View
          className="mt-4 flex-row items-center rounded-2xl px-3 py-2"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <Ionicons name="cut" size={18} color={colors.primary} />
          <Text className="font-semibold ml-2" style={{ color: colors.text }}>
            BookMyDarzi Admin
          </Text>
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
            badgeCount={
              item.permission === 'notifications'
                ? unreadCount
                : item.permission === 'supportTickets'
                  ? (supportBadgeCount || undefined)
                  : item.permission === 'broadcasts'
                    ? broadcastsData?.total
                    : item.route === '/(drawer)/pickups'
                      ? pickupBroadcastsData?.total
                      : item.route === '/(drawer)/deliveries'
                        ? deliveryBroadcastsData?.total
                        : item.route === '/(drawer)/returns'
                          ? returnBroadcastsData?.total
                          : item.route === '/(drawer)/repair-pickups'
                            ? repairPickupBroadcastsData?.total
                            : item.route === '/(drawer)/repair-deliveries'
                              ? repairDeliveryBroadcastsData?.total
                              : undefined
            }
          />
        ))}
      </ScrollView>

      <View
        className="px-3 pb-6 border-t"
        style={{ paddingBottom: insets.bottom + 16, borderColor: colors.border }}
      >
        <DrawerItem
          label="Logout"
          icon="log-out-outline"
          danger
          onPress={() => logoutMutation.mutate()}
        />
      </View>
    </View>
  );
};
