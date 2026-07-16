import { useMemo } from 'react';
import {
  canAccessDrawerPath,
  getDefaultRouteForRole,
  resolvePermissions,
  type AppPermissions,
} from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';

export const usePermissions = (): {
  permissions: AppPermissions;
  defaultRoute: string;
  canAccessPath: (pathname: string) => boolean;
  role: string | undefined;
} => {
  const { user, selectedRole } = useAuth();
  const role = user?.role ?? selectedRole ?? undefined;

  const permissions = useMemo(
    () => resolvePermissions(user?.role, selectedRole),
    [user?.role, selectedRole],
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
