import type { LoginRole } from '@/constants/roles';
import type { UserRole } from '@/types/auth';

export interface AppPermissions {
  dashboard: boolean;
  users: boolean;
  orders: boolean;
  tailors: boolean;
  staff: boolean;
  applications: boolean;
  measurements: boolean;
  analytics: boolean;
  notifications: boolean;
  settings: boolean;
  profile: boolean;
}

/** Full admin access — all modules visible */
const ADMIN_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: true,
  orders: true,
  tailors: true,
  staff: true,
  applications: true,
  measurements: true,
  analytics: true,
  notifications: true,
  settings: true,
  profile: true,
};

/** Matches pre-RBAC employee drawer routes */
const EMPLOYEE_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: true,
  orders: true,
  tailors: false,
  staff: false,
  applications: false,
  measurements: false,
  analytics: false,
  notifications: true,
  settings: true,
  profile: true,
};

/** Matches pre-RBAC tailor drawer routes */
const TAILOR_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: false,
  orders: true,
  tailors: false,
  staff: false,
  applications: false,
  measurements: true,
  analytics: false,
  notifications: true,
  settings: true,
  profile: true,
};

const normalizeRole = (role?: string | null): string | undefined => {
  if (!role) return undefined;
  const value = role.toLowerCase().trim();
  return value.length > 0 ? value : undefined;
};

/**
 * Resolve permissions from backend user.role, with selectedRole (login portal) as fallback.
 * API may omit role or return generic "user" — selectedRole preserves admin portal access.
 */
export const resolvePermissions = (
  userRole?: UserRole | string | null,
  selectedRole?: LoginRole | string | null,
): AppPermissions => {
  const userNorm = normalizeRole(userRole);
  const selectedNorm = normalizeRole(selectedRole);

  const effectiveRole = userNorm ?? selectedNorm;

  if (
    effectiveRole === 'admin' ||
    effectiveRole === 'superadmin' ||
    (userNorm === 'user' && selectedNorm === 'admin')
  ) {
    return ADMIN_PERMISSIONS;
  }

  if (effectiveRole === 'employee') {
    return EMPLOYEE_PERMISSIONS;
  }

  if (effectiveRole === 'tailor') {
    return TAILOR_PERMISSIONS;
  }

  // Authenticated via admin portal but API role not yet loaded
  if (selectedNorm === 'admin') {
    return ADMIN_PERMISSIONS;
  }
  if (selectedNorm === 'employee') {
    return EMPLOYEE_PERMISSIONS;
  }
  if (selectedNorm === 'tailor') {
    return TAILOR_PERMISSIONS;
  }

  // Safe default for admin app: full access (modules stay in project; RBAC hides per role when known)
  return ADMIN_PERMISSIONS;
};

export const ROUTE_PERMISSION_MAP: Record<string, keyof AppPermissions> = {
  dashboard: 'dashboard',
  orders: 'orders',
  customers: 'users',
  tailors: 'tailors',
  employees: 'staff',
  applications: 'applications',
  measurements: 'measurements',
  revenue: 'analytics',
  notifications: 'notifications',
  settings: 'settings',
  profile: 'profile',
};

export const getDefaultRouteForRole = (
  userRole?: UserRole | string | null,
  selectedRole?: LoginRole | string | null,
): string => {
  const permissions = resolvePermissions(userRole, selectedRole);
  if (permissions.dashboard) return '/(drawer)/dashboard';
  if (permissions.orders) return '/(drawer)/orders';
  return '/(drawer)/profile';
};

export const canAccessDrawerPath = (
  pathname: string,
  permissions: AppPermissions,
): boolean => {
  const clean = pathname.replace(/^\//, '').replace(/^\(drawer\)\//, '');
  const segment = clean.split('/')[0]?.replace('index', '');

  if (!segment || segment === '(drawer)') {
    return permissions.dashboard;
  }

  const permissionKey = ROUTE_PERMISSION_MAP[segment];
  if (!permissionKey) {
    return true;
  }

  return permissions[permissionKey];
};
