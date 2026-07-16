import type { LoginRole } from '@/constants/roles';
import {
  canAccessDrawerPath,
  getDefaultRouteForRole,
  resolvePermissions,
} from '@/constants/permissions';
import type { UserRole } from '@/types/auth';

export const canAccessRoute = (
  role: LoginRole | UserRole | null,
  route: string,
  selectedRole?: LoginRole | null,
): boolean => {
  if (!role && !selectedRole) return false;
  return canAccessDrawerPath(route, resolvePermissions(role, selectedRole));
};

export { getDefaultRouteForRole, resolvePermissions };
