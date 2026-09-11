import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Header, ScreenContent, Tabs, type TabItem } from '@/components/ui';
import { AdminAccessPanel } from '@/features/rbac/components/AdminAccessPanel';
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

function RolesMatrixPanel({ myRole }: { myRole: string | undefined }) {
  const { colors } = useTheme();
  const { isLargeScreen } = useResponsive();
  // On phones the table is horizontally scrollable at its natural (compact)
  // column widths; on tablet/desktop there's room to let the role columns
  // flex-grow and fill the wider content column instead of leaving dead
  // space to the right of a table stuck at its phone-sized width.
  const roleColClass = isLargeScreen ? 'flex-1 py-2.5 px-2 items-center' : 'w-24 py-2.5 px-2 items-center';
  const moduleColWidthClass = isLargeScreen ? 'w-56' : 'w-40';
  const moduleColClass = `${moduleColWidthClass} py-2.5 px-2 justify-center`;

  return (
    <>
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

      <ScrollView horizontal={!isLargeScreen} showsHorizontalScrollIndicator={false}>
        <View style={isLargeScreen ? { width: '100%' } : undefined}>
          <View className="flex-row border-b" style={{ borderColor: colors.border }}>
            <View className={`${moduleColWidthClass} py-2.5 px-2`}>
              <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                Module
              </Text>
            </View>
            {ROLES.map((role) => (
              <View key={role} className={roleColClass}>
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
              <View className={moduleColClass}>
                <Text className="text-xs font-semibold" style={{ color: colors.text }} numberOfLines={2}>
                  {MODULE_LABELS[moduleKey]}
                </Text>
              </View>
              {ROLES.map((role) => {
                const granted = Boolean(resolvePermissions(role, role)[moduleKey]);
                return (
                  <View key={role} className={roleColClass}>
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
    </>
  );
}

type RolesTab = 'roles' | 'admin_access';

const TABS: TabItem[] = [
  { id: 'roles', label: 'Roles', icon: 'grid-outline' },
  { id: 'admin_access', label: 'Admin Access', icon: 'key-outline' },
];

export default function RolesPermissionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const myRole = user?.role?.toLowerCase();
  // Per-account grant/revoke/lockout is superadmin-only server-side (see
  // app/api/v1/rbac/user_permissions.py's require_roles(SUPERADMIN)) - hide
  // the tab entirely for admin/employee rather than showing a tab whose
  // every action would 403.
  const isSuperadmin = myRole === 'superadmin';
  const [tab, setTab] = useState<RolesTab>('roles');
  const activeTab: RolesTab = isSuperadmin ? tab : 'roles';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Roles & Permissions"
        subtitle={activeTab === 'roles' ? 'Read-only access matrix' : 'Per-account overrides'}
      />
      {isSuperadmin ? <Tabs tabs={TABS} activeTab={activeTab} onChange={(id) => setTab(id as RolesTab)} /> : null}
      <ScreenContent showsVerticalScrollIndicator={false}>
        <View className="pt-4">
          {activeTab === 'roles' ? <RolesMatrixPanel myRole={myRole} /> : <AdminAccessPanel />}
        </View>
        <View className="mb-6" />
      </ScreenContent>
    </View>
  );
}
