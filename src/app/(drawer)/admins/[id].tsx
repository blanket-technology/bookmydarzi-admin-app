import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, Header, Loader, Pressable, ScreenContent } from '@/components/ui';
import { useStaffMember } from '@/features/staff/hooks/useStaff';
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
import type { PermissionCellState, RbacPermission, RbacScreen } from '@/types/rbac';

// Mobile equivalent of BMD-Admin's Settings > Admin Access screen
// (AdminAccessSection.jsx) - same three-state model (role default / account
// override / explicit revoke), same underlying RBAC endpoints. The web
// version uses a wide table; here each screen is a card with its granted
// permissions as chips, since a 23-row x 8-column grid doesn't fit a phone.

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

function PermissionChip({
  state,
  label,
  busy,
  onPress,
  colors,
}: {
  state: PermissionCellState;
  label: string;
  busy: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const styleByState: Record<PermissionCellState, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    'granted-role': { bg: `${colors.success}22`, fg: colors.success, icon: 'checkmark-circle' },
    'granted-override': { bg: colors.primaryLight, fg: colors.primary, icon: 'shield-checkmark' },
    revoked: { bg: `${colors.error}22`, fg: colors.error, icon: 'shield-outline' },
    none: { bg: colors.background, fg: colors.textMuted, icon: 'remove' },
  };
  const s = styleByState[state];
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full mr-2 mb-2"
      style={{ backgroundColor: s.bg, opacity: busy ? 0.5 : 1, borderWidth: 1, borderColor: colors.border }}
    >
      <Ionicons name={s.icon} size={13} color={s.fg} />
      <Text className="text-[11px] font-semibold capitalize" style={{ color: s.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ScreenPermissionCard({
  screen,
  permissions,
  userId,
  effective,
  colors,
}: {
  screen: RbacScreen;
  permissions: RbacPermission[];
  userId: number;
  effective: ReturnType<typeof useEffectivePermissions>['data'];
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const grant = useGrantPermissionMutation(userId);
  const revoke = useRevokePermissionMutation(userId);
  const clearOverride = useClearOverrideMutation(userId);

  const handlePress = async (perm: RbacPermission) => {
    // Without the effective permissions every cell would read as "not allowed" and a
    // tap would write a grant/revoke based on that wrong picture: never act blind.
    if (!effective || busyKey) return;
    const state = cellState(screen.screen_name, perm.permission_name, effective);
    const key = `${screen.id}-${perm.id}`;
    setBusyKey(key);
    try {
      if (state === 'revoked') {
        const revokedRow = effective?.explicit_revokes.find(
          (r) => r.screen_name === screen.screen_name && r.permission_name === perm.permission_name,
        );
        if (revokedRow) await clearOverride.mutateAsync(revokedRow.id);
      } else if (state === 'none' || state === 'granted-role') {
        await grant.mutateAsync({ screenId: screen.id, permissionId: perm.id });
      } else {
        // granted-override -> revoke removes this account's extra access
        await revoke.mutateAsync({ screenId: screen.id, permissionId: perm.id });
      }
    } catch {
      // The mutations already toast the reason; nothing else to do here.
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card className="mb-3">
      <Text className="font-bold mb-2 capitalize" style={{ color: colors.text }}>
        {screen.screen_name.replace(/_/g, ' ')}
      </Text>
      <View className="flex-row flex-wrap">
        {permissions.map((perm) => (
          <PermissionChip
            key={perm.id}
            label={perm.permission_name.replace(/_/g, ' ')}
            state={cellState(screen.screen_name, perm.permission_name, effective)}
            busy={busyKey === `${screen.id}-${perm.id}`}
            onPress={() => handlePress(perm)}
            colors={colors}
          />
        ))}
      </View>
    </Card>
  );
}

export default function AdminPermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const userId = Number(id);
  const [unlockConfirmVisible, setUnlockConfirmVisible] = useState(false);

  const { data: admin, isLoading: adminLoading, isError: adminError, refetch: refetchAdmin } = useStaffMember(id);
  const { data: screens, isLoading: screensLoading } = useRbacScreens();
  const { data: permissions, isLoading: permsLoading } = useRbacPermissions();
  const {
    data: effective,
    isLoading: effectiveLoading,
    isError: effectiveError,
    refetch: refetchEffective,
  } = useEffectivePermissions(userId);
  const { data: lockout } = useLockoutStatus(userId);
  const unlock = useUnlockAccountMutation(userId);

  const isLoading = adminLoading || screensLoading || permsLoading || effectiveLoading;

  const sortedScreens = useMemo(
    () => [...(screens ?? [])].sort((a, b) => a.screen_name.localeCompare(b.screen_name)),
    [screens],
  );

  if (isLoading) return <Loader fullScreen message="Loading permissions..." />;

  // A failed load must offer Retry, not claim the admin does not exist or show
  // every permission as revoked.
  if (adminError || effectiveError) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Admin Access" showBack />
        <EmptyState
          title="Couldn't load permissions"
          description="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => {
            refetchAdmin();
            refetchEffective();
          }}
        />
      </View>
    );
  }

  if (!admin) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Admin Access" showBack />
        <EmptyState title="Admin not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Admin Access" showBack />
      <ScreenContent>
        <Card className="flex-row items-center mb-4">
          <Avatar name={admin.full_name ?? admin.email} size={48} />
          <View className="ml-3 flex-1">
            <Text className="font-bold" style={{ color: colors.text }}>
              {admin.full_name ?? '-'}
            </Text>
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              {admin.email}
            </Text>
          </View>
        </Card>

        {lockout && (
          <Card className="mb-4">
            {lockout.locked ? (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <Ionicons name="lock-closed" size={16} color={colors.error} />
                  <Text className="text-xs font-semibold flex-1" style={{ color: colors.error }}>
                    Locked out
                    {lockout.retry_after_seconds
                      ? ` — retry in ${Math.ceil(lockout.retry_after_seconds / 60)} min`
                      : ''}
                  </Text>
                </View>
                <Button
                  title="Unlock Now"
                  size="sm"
                  loading={unlock.isPending}
                  onPress={() => setUnlockConfirmVisible(true)}
                />
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                  Not locked
                  {lockout.failed_attempts > 0
                    ? ` (${lockout.failed_attempts} recent failed attempt${lockout.failed_attempts !== 1 ? 's' : ''})`
                    : ''}
                </Text>
              </View>
            )}
          </Card>
        )}

        <Card className="mb-4">
          <Text className="text-xs font-semibold mb-2" style={{ color: colors.text }}>
            Tap a permission to change it
          </Text>
          <View className="gap-1.5">
            <LegendRow icon="checkmark-circle" color={colors.success} label="Allowed by role — tap to also grant it directly" colors={colors} />
            <LegendRow icon="shield-checkmark" color={colors.primary} label="Granted specifically to this account — tap to take away" colors={colors} />
            <LegendRow icon="shield-outline" color={colors.error} label="Blocked for this account only — tap to clear the block" colors={colors} />
            <LegendRow icon="remove" color={colors.textMuted} label="Not allowed — tap to grant" colors={colors} />
          </View>
        </Card>

        {sortedScreens.map((screen) => (
          <ScreenPermissionCard
            key={screen.id}
            screen={screen}
            permissions={permissions ?? []}
            userId={userId}
            effective={effective}
            colors={colors}
          />
        ))}
      </ScreenContent>

      <ConfirmModal
        visible={unlockConfirmVisible}
        title="Unlock account?"
        message={`Unlock ${admin.full_name ?? admin.email}'s account? This immediately clears their failed-login lockout.`}
        confirmLabel="Unlock"
        loading={unlock.isPending}
        onConfirm={async () => {
          await unlock.mutateAsync();
          setUnlockConfirmVisible(false);
        }}
        onCancel={() => setUnlockConfirmVisible(false)}
      />
    </View>
  );
}

function LegendRow({
  icon,
  color,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={14} color={color} />
      <Text className="text-[11px] flex-1" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}
