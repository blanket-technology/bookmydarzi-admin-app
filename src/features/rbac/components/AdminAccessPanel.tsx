import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, ConfirmModal, EmptyState, Loader, Pressable, SearchBar } from '@/components/ui';
import { useStaff } from '@/features/staff/hooks/useStaff';
import {
  useClearOverrideMutation,
  useEffectivePermissions,
  useGrantPermissionMutation,
  useLockoutStatus,
  useRbacPermissions,
  useRbacScreens,
  useRevokePermissionMutation,
  useUnlockAccountMutation,
} from '@/features/staff/hooks/useRbac';
import { useTheme } from '@/hooks/useTheme';
import type { AdminStaffListItem } from '@/types/staff';
import type { PermissionCellState, RbacPermission, RbacScreen } from '@/types/rbac';

// Per-account permission override matrix - the mobile counterpart to web's
// AdminAccessSection.jsx. Superadmin-only: grant/revoke individual
// permissions for one admin account beyond their role default, or reset a
// cell back to role default. Separate concern from the read-only Roles tab
// next to it (that one shows role *defaults*; this one shows/edits one
// specific account's *effective* access, including any override).
function cellState(
  screenName: string,
  permName: string,
  effective: ReturnType<typeof useEffectivePermissions>['data'],
): PermissionCellState {
  if (!effective) return 'none';
  const isRevoked = effective.explicit_revokes.some(
    (r) => r.screen_name === screenName && r.permission_name === permName,
  );
  if (isRevoked) return 'revoked';
  const isOverridden = effective.account_overrides.some(
    (s) => s.screen_name === screenName && s.permissions.includes(permName),
  );
  if (isOverridden) return 'granted-override';
  const isRoleDefault = effective.role_default_screens.some(
    (s) => s.screen_name === screenName && s.permissions.includes(permName),
  );
  if (isRoleDefault) return 'granted-role';
  return 'none';
}

const CELL_ICON: Record<PermissionCellState, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  'granted-role': { name: 'checkmark-circle', color: '#10b981' },
  'granted-override': { name: 'shield-checkmark', color: '#0d9488' },
  revoked: { name: 'shield-outline', color: '#f43f5e' },
  none: { name: 'remove', color: '#9ca3af' },
};

function AdminPicker({ onSelect }: { onSelect: (admin: AdminStaffListItem) => void }) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useStaff({ role: 'admin' });

  const admins = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (a) => (a.full_name ?? '').toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <View>
      <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
        Grant or restrict what a specific admin account can access, beyond their role default.
      </Text>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search admin by name or email..." />
      {isLoading ? (
        <Loader message="Loading admin accounts..." />
      ) : isError ? (
        <EmptyState title="Failed to load admin accounts" actionLabel="Retry" onAction={() => refetch()} />
      ) : admins.length === 0 ? (
        <Text className="text-xs text-center py-10" style={{ color: colors.textMuted }}>
          {search ? 'No matching admin accounts.' : 'No admin accounts found.'}
        </Text>
      ) : (
        admins.map((admin) => (
          <Pressable
            key={admin.id}
            onPress={() => onSelect(admin)}
            className="flex-row items-center rounded-2xl p-3 mb-2 border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Text className="font-bold text-sm" style={{ color: colors.primary }}>
                {(admin.full_name || admin.email || '?')[0]?.toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                {admin.full_name ?? '—'}
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
                {admin.email ?? '—'}
              </Text>
            </View>
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: admin.is_active ? '#dcfce7' : '#fee2e2' }}
            >
              <Text className="text-[10px] font-bold" style={{ color: admin.is_active ? '#16a34a' : '#dc2626' }}>
                {admin.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

function AdminPermissionEditor({ admin, onBack }: { admin: AdminStaffListItem; onBack: () => void }) {
  const { colors } = useTheme();
  const adminId = Number(admin.id);
  const { data: screensRaw } = useRbacScreens();
  const { data: permissions } = useRbacPermissions();
  const { data: effective, isLoading } = useEffectivePermissions(adminId);
  const { data: lockout } = useLockoutStatus(adminId);
  const grantMutation = useGrantPermissionMutation(adminId);
  const revokeMutation = useRevokePermissionMutation(adminId);
  const clearMutation = useClearOverrideMutation(adminId);
  const unlockMutation = useUnlockAccountMutation(adminId);

  const [unlockConfirmVisible, setUnlockConfirmVisible] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const screens = screensRaw ?? [];
  const perms = permissions ?? [];

  const findMappingId = (screen: RbacScreen, perm: RbacPermission): number | undefined => {
    const revokedRow = effective?.explicit_revokes.find(
      (r) => r.screen_name === screen.screen_name && r.permission_name === perm.permission_name,
    );
    if (revokedRow) return revokedRow.id;
    const overrideScreen = effective?.account_overrides.find((s) => s.screen_name === screen.screen_name);
    const grantedRow = overrideScreen?.permission_entries?.find(
      (e) => e.permission_name === perm.permission_name,
    );
    return grantedRow?.id;
  };

  const handleCellPress = async (screen: RbacScreen, perm: RbacPermission) => {
    const state = cellState(screen.screen_name, perm.permission_name, effective);
    const key = `${screen.id}-${perm.id}`;
    setBusyKey(key);
    try {
      if (state === 'revoked') {
        const mappingId = findMappingId(screen, perm);
        if (mappingId) await clearMutation.mutateAsync(mappingId);
      } else if (state === 'none' || state === 'granted-role') {
        await grantMutation.mutateAsync({ screenId: screen.id, permissionId: perm.id });
      } else {
        await revokeMutation.mutateAsync({ screenId: screen.id, permissionId: perm.id });
      }
    } finally {
      setBusyKey(null);
    }
  };

  if (isLoading) return <Loader message="Loading permissions..." />;

  return (
    <View>
      <Pressable onPress={onBack} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
        <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.textSecondary }}>
          Back to admin list
        </Text>
      </Pressable>

      <View className="flex-row items-center mb-4">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <Text className="font-bold text-lg" style={{ color: colors.primary }}>
            {(admin.full_name || admin.email || '?')[0]?.toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {admin.full_name ?? '—'}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {admin.email}
          </Text>
        </View>
      </View>

      {lockout ? (
        lockout.locked ? (
          <View
            className="flex-row items-center justify-between rounded-2xl px-3.5 py-2.5 mb-4"
            style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="lock-closed" size={14} color="#e11d48" />
              <Text className="text-xs font-semibold ml-1.5" style={{ color: '#e11d48' }} numberOfLines={2}>
                Locked out
                {lockout.retry_after_seconds
                  ? ` — retry in ${Math.ceil(lockout.retry_after_seconds / 60)} min`
                  : ''}
              </Text>
            </View>
            <Button
              title={unlockMutation.isPending ? 'Unlocking...' : 'Unlock Now'}
              onPress={() => setUnlockConfirmVisible(true)}
              loading={unlockMutation.isPending}
            />
          </View>
        ) : (
          <View
            className="flex-row items-center rounded-2xl px-3.5 py-2.5 mb-4"
            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }}
          >
            <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
            <Text className="text-xs font-semibold ml-1.5" style={{ color: '#16a34a' }}>
              Not locked
              {lockout.failed_attempts > 0
                ? ` (${lockout.failed_attempts} recent failed attempt${lockout.failed_attempts !== 1 ? 's' : ''})`
                : ''}
            </Text>
          </View>
        )
      ) : null}

      <View className="rounded-2xl px-3.5 py-3 mb-4" style={{ backgroundColor: colors.primaryLight }}>
        <Text className="text-xs font-semibold mb-2" style={{ color: colors.primary }}>
          Tap any cell to change it.
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="checkmark-circle" size={13} color="#10b981" />
            <Text className="text-[10px]" style={{ color: colors.text }}>Role default</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="shield-checkmark" size={13} color="#0d9488" />
            <Text className="text-[10px]" style={{ color: colors.text }}>Granted to account</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="shield-outline" size={13} color="#f43f5e" />
            <Text className="text-[10px]" style={{ color: colors.text }}>Blocked for account</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="remove" size={13} color="#9ca3af" />
            <Text className="text-[10px]" style={{ color: colors.text }}>Not allowed</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row border-b" style={{ borderColor: colors.border }}>
            <View className="w-36 py-2.5 px-2">
              <Text className="text-[11px] font-bold" style={{ color: colors.textSecondary }}>
                Module
              </Text>
            </View>
            {perms.map((p) => (
              <View key={p.id} className="w-24 py-2.5 px-2 items-center">
                <Text className="text-[11px] font-bold text-center capitalize" style={{ color: colors.textSecondary }}>
                  {p.permission_name.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
          </View>
          {screens.map((screen, i) => (
            <View
              key={screen.id}
              className="flex-row border-b"
              style={{ borderColor: colors.border, backgroundColor: i % 2 === 1 ? colors.surface : 'transparent' }}
            >
              <View className="w-36 py-2.5 px-2 justify-center">
                <Text className="text-xs font-semibold capitalize" style={{ color: colors.text }} numberOfLines={2}>
                  {screen.screen_name.replace(/_/g, ' ')}
                </Text>
              </View>
              {perms.map((perm) => {
                const state = cellState(screen.screen_name, perm.permission_name, effective);
                const key = `${screen.id}-${perm.id}`;
                const busy = busyKey === key;
                const icon = CELL_ICON[state];
                return (
                  <View key={perm.id} className="w-24 py-2.5 px-2 items-center justify-center">
                    <Pressable
                      onPress={() => handleCellPress(screen, perm)}
                      disabled={busy}
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ opacity: busy ? 0.5 : 1 }}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      ) : (
                        <Ionicons name={icon.name} size={17} color={icon.color} />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={unlockConfirmVisible}
        title="Unlock Account?"
        message={`Unlock ${admin.full_name ?? admin.email}'s account? This immediately clears their failed-login lockout.`}
        confirmLabel="Yes, Unlock"
        loading={unlockMutation.isPending}
        onConfirm={async () => {
          setUnlockConfirmVisible(false);
          await unlockMutation.mutateAsync();
        }}
        onCancel={() => setUnlockConfirmVisible(false)}
      />
    </View>
  );
}

export const AdminAccessPanel = () => {
  const [selected, setSelected] = useState<AdminStaffListItem | null>(null);
  return selected ? (
    <AdminPermissionEditor admin={selected} onBack={() => setSelected(null)} />
  ) : (
    <AdminPicker onSelect={setSelected} />
  );
};
