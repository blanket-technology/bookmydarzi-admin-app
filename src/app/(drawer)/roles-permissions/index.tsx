import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { Header } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { resolvePermissions, type AppPermissions } from '@/constants/permissions';

// Read-only mirror of Admin_Web's RolesSection.jsx - this app has no backend
// CRUD for per-role permissions either (see resolvePermissions in
// constants/permissions.ts, which is itself the hardcoded source of truth on
// both platforms). This screen exists so Admin/Superadmin can audit what
// each role sees without opening the web panel.
const ROLES = ['superadmin', 'admin', 'employee', 'tailor'] as const;
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  employee: 'Bridge',
  tailor: 'Tailor',
};

const MODULE_LABELS: Partial<Record<keyof AppPermissions, string>> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  users: 'Customers',
  tailors: 'Tailors',
  staff: 'Bridge / Employees',
  adminManagement: 'Admin Management',
  applications: 'Tailor Applications',
  analytics: 'Revenue / Analytics',
  notifications: 'Notifications',
  chat: 'Chat',
  cancellations: 'Cancellations',
  supportTickets: 'Support Tickets',
  catalog: 'Catalog',
  homepage: 'Homepage (CMS)',
  offers: 'Offers & Coupons',
  inventory: 'Inventory',
  lookbook: 'Lookbook',
  serviceAreas: 'Service Areas',
  auditLog: 'Audit Log',
  rolesPermissions: 'Roles & Permissions',
  broadcasts: 'Broadcasts (Tailor)',
  deliveries: 'Deliveries (Bridge)',
  leave: 'Leave Requests',
  settings: 'Settings',
  profile: 'Profile',
};

const MODULE_KEYS = Object.keys(MODULE_LABELS) as (keyof AppPermissions)[];

export default function RolesPermissionsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const myRole = user?.role?.toLowerCase();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Roles & Permissions" subtitle="Read-only access matrix" />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <View
          className="flex-row items-start rounded-2xl px-4 py-3 mb-4"
          style={{ backgroundColor: colors.primaryLight, gap: 10 }}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <Text className="text-xs flex-1" style={{ color: colors.text }}>
            This matrix is enforced in code on both this app and the web admin panel, and mirrored by the
            backend's role checks. It is read-only by design.
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View className="flex-row border-b" style={{ borderColor: colors.border }}>
                <View className="w-40 py-2.5 px-2">
                  <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                    Module
                  </Text>
                </View>
                {ROLES.map((role) => (
                  <View key={role} className="w-24 py-2.5 px-2 items-center">
                    <Text
                      className="text-xs font-bold text-center"
                      style={{ color: role === myRole ? colors.primary : colors.textSecondary }}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                    {role === myRole ? (
                      <Text className="text-[10px]" style={{ color: colors.primary }}>
                        (you)
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>

              {MODULE_KEYS.map((moduleKey, i) => (
                <View
                  key={moduleKey}
                  className="flex-row border-b"
                  style={{ borderColor: colors.border, backgroundColor: i % 2 === 1 ? colors.surface : 'transparent' }}
                >
                  <View className="w-40 py-2.5 px-2 justify-center">
                    <Text className="text-xs font-semibold" style={{ color: colors.text }} numberOfLines={2}>
                      {MODULE_LABELS[moduleKey]}
                    </Text>
                  </View>
                  {ROLES.map((role) => {
                    const granted = Boolean(resolvePermissions(role, role)[moduleKey]);
                    return (
                      <View key={role} className="w-24 py-2.5 px-2 items-center justify-center">
                        {granted ? (
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        ) : (
                          <View className="w-3 h-px" style={{ backgroundColor: colors.border }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
          <View className="mb-6" />
        </ScrollView>
      </View>
    </View>
  );
}
