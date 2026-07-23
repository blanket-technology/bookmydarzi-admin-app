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
  chat: boolean;
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
  chat: true,
  settings: true,
  profile: true,
};

/** Matches pre-RBAC employee drawer routes.
 * users: false — GET /admin/users is admin/superadmin-only server-side
 * (app/api/v1/endpoints/admin.py's require_admin); granting this in the UI
 * previously let employees reach a Customers screen that always 403'd. */
const EMPLOYEE_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: false,
  orders: true,
  tailors: false,
  staff: false,
  applications: false,
  measurements: false,
  analytics: false,
  notifications: true,
  chat: true,
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
  // Backend chat_v2 restricts session access to the session's own customer
  // or staff (admin/superadmin/employee) — see _get_authorized_session /
  // _STAFF_ROLES in app/api/v1/endpoints/chat_v2.py. Tailors have no
  // legitimate reason to reach any support session.
  chat: false,
  settings: true,
  profile: true,
};

/** Most restrictive default — used when the role cannot be resolved at all. */
const NO_PERMISSIONS: AppPermissions = {
  dashboard: false,
  users: false,
  orders: false,
  tailors: false,
  staff: false,
  applications: false,
  measurements: false,
  analytics: false,
  notifications: false,
  chat: false,
  settings: false,
  profile: false,
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

  // Fail closed: an unresolvable role gets no module access rather than
  // full admin access. Route guards (canAccessDrawerPath) are the only
  // isolation between Admin/Employee/Tailor in this app, so an unknown
  // role must never silently inherit ADMIN_PERMISSIONS.
  return NO_PERMISSIONS;
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
  chat: 'chat',
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
  if (permissions.profile) return '/(drawer)/profile';
  // No module is accessible for this role (NO_PERMISSIONS) — routing back
  // into the drawer would redirect-loop against RoutePermissionGuard, since
  // every drawer path (including /profile) would also be denied. Send the
  // user out of the authenticated app entirely instead.
  return '/(auth)/login';
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
    // Fail closed: a route that isn't in the map should never be silently
    // allowed. Legitimate routes must be added to ROUTE_PERMISSION_MAP above
    // (verified against every top-level (drawer) segment).
    return false;
  }

  return permissions[permissionKey];
};
