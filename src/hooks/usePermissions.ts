import { useMemo } from 'react';
import {
  canAccessDrawerPath,
  getDefaultRouteForRole,
  resolvePermissions,
  type AppPermissions,
} from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export const usePermissions = (): {
  permissions: AppPermissions;
  defaultRoute: string;
  canAccessPath: (pathname: string) => boolean;
  role: string | undefined;
} => {
  const { user, selectedRole } = useAuth();
  const role = user?.role ?? selectedRole ?? undefined;
  // Set at login for admin accounts (role default merged with per-account
  // RBAC overrides — see useAuthMutations.ts completeAuthSession). null for
  // every other role, or a session that predates this feature — falls back
  // to the plain role-resolved set, identical to previous behavior.
  const storedPermissions = useAuthStore((s) => s.permissions);

  const permissions = useMemo(
    () => storedPermissions ?? resolvePermissions(user?.role, selectedRole),
    [storedPermissions, user?.role, selectedRole],
  );
  const defaultRoute = useMemo(
    () => getDefaultRouteForRole(user?.role, selectedRole),
    [user?.role, selectedRole],
  );

  return {
    permissions,
    defaultRoute,
    role,
    canAccessPath: (pathname: string) => canAccessDrawerPath(pathname, permissions),
  };
};
