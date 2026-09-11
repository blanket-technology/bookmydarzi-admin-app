import type { LoginRole } from '@/constants/roles';
import type { UserRole } from '@/types/auth';
import type { EffectivePermissions } from '@/types/rbac';

export interface AppPermissions {
  dashboard: boolean;
  users: boolean;
  orders: boolean;
  tailors: boolean;
  staff: boolean;
  applications: boolean;
  analytics: boolean;
  notifications: boolean;
  chat: boolean;
  settings: boolean;
  profile: boolean;
  /** Cancellation-request review/approve/reject and cancellation-policy
   * management — admin/superadmin only server-side (require_roles(ADMIN,
   * SUPERADMIN) throughout app/api/v1/endpoints/cancellation.py). */
  cancellations: boolean;
  /** Register/list admin accounts — superadmin only. The backend enforces
   * this independently (staff_service.py's _CREATABLE_BY only lets a
   * superadmin-role caller create an 'admin' or 'superadmin' account), so
   * this flag only controls whether the nav item/screen is reachable —
   * it isn't the actual security boundary. */
  adminManagement: boolean;
  /** Support tickets (app/api/v1/endpoints/support.py) — a generic,
   * role-agnostic channel every role can use (get_current_user only, no
   * require_roles), unlike chat_v2 which explicitly excludes tailors. This
   * is the tailor's support/issue-reporting channel. */
  supportTickets: boolean;
  /** Catalog management (categories/service lines/services) —
   * app/api/v1/endpoints/catalog.py's write routes are require_admin only. */
  catalog: boolean;
  /** Homepage banners/offers — app/api/v1/endpoints/home_admin.py,
   * require_admin only. */
  homepage: boolean;
  /** Inventory — app/api/v1/endpoints/inventory.py. Writes are
   * ADMIN/SUPERADMIN/EMPLOYEE; TAILOR gets read-only (backend allows GET
   * for tailor too) — the screen itself hides write controls by role. */
  inventory: boolean;
  /** Lookbook admin — app/api/v1/endpoints/lookbook.py's admin_router is
   * ADMIN/SUPERADMIN only (EMPLOYEE excluded, unlike catalog/inventory). */
  lookbook: boolean;
  /** Broadcast order offers — app/api/v1/endpoints/broadcast.py. Tailor's
   * only path to see and claim an unassigned broadcasted order: GET
   * /orders/my-orders structurally excludes them (TailorId is still NULL
   * until accepted), so this is a distinct screen, not a filter on Orders. */
  broadcasts: boolean;
  /** Delivery broadcast offers (Bridge/employee pickup-delivery role) —
   * app/api/v1/endpoints/employee.py's /delivery-broadcasts routes. The
   * employee's online/offline toggle + FCFS delivery-offer accept/decline
   * screen, mirrors "broadcasts" (the tailor equivalent). */
  deliveries: boolean;
  /** Leave requests — app/api/v1/endpoints/leave_request.py. Tailor/Bridge
   * (require_roles(TAILOR, EMPLOYEE)) apply for leave and see their own
   * request history; Admin/Superadmin (require_admin_permission's
   * "leave_requests" screen) review, approve, or reject any staff member's
   * request. Same permission key, different screen content by role. */
  leave: boolean;
  /** Offers & coupons — app/api/v1/endpoints/home_admin.py's /offers routes,
   * require_admin_permission(ADMIN, SUPERADMIN, screen="cms"). Matches
   * Admin_Web's "coupons" module (same backend screen as homepage/"cms"). */
  offers: boolean;
  /** Service areas — app/api/v1/endpoints/location.py's /admin/service-areas
   * routes, require_admin_permission(ADMIN, SUPERADMIN, screen="service_areas"). */
  serviceAreas: boolean;
  /** Audit log viewer — app/api/v1/endpoints/admin.py's /audit-logs routes,
   * require_admin_permission(ADMIN, SUPERADMIN, screen="audit_log"). */
  auditLog: boolean;
  /** Roles & permissions matrix — read-only display of role->module access,
   * mirrors Admin_Web's RolesSection.jsx (no backend CRUD exists for this;
   * it's a static client-side table, superadmin-only in the UI). */
  rolesPermissions: boolean;
  /** FAQ management — app/api/v1/endpoints/support.py's /support/faqs
   * write routes, require_admin_permission(ADMIN, SUPERADMIN, screen="support_faqs"). */
  faqs: boolean;
  /** Billing/platform-fee config — app/api/v1/endpoints/admin.py's
   * /admin/settings/billing routes, require_admin_permission(SUPERADMIN
   * only, screen="system_config") — stricter than most admin screens. */
  billing: boolean;
}

/** Full admin access — all modules visible, except registering other admins
 * and revenue/analytics (superadmin-only — mirrors the backend, which
 * strips the "revenue" key from GET /admin/dashboard for any non-superadmin
 * caller: app/api/v1/endpoints/admin.py's admin_dashboard route). */
const ADMIN_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: true,
  orders: true,
  tailors: true,
  staff: true,
  applications: true,
  analytics: false,
  notifications: true,
  chat: true,
  settings: true,
  profile: true,
  cancellations: true,
  adminManagement: false,
  supportTickets: true,
  catalog: true,
  homepage: true,
  inventory: true,
  lookbook: true,
  broadcasts: false,
  deliveries: false,
  // GET/PATCH /admin/leave-requests* is ADMIN/SUPERADMIN-only server-side
  // (require_admin_permission(ADMIN, SUPERADMIN, screen="leave_requests")).
  // The Leave screen renders a review UI for this role instead of the
  // tailor/employee self-service apply/withdraw UI - see leave/index.tsx.
  leave: true,
  offers: true,
  serviceAreas: true,
  auditLog: true,
  // Matches Admin_Web's product decision: rolesPermissions is superadmin-only.
  rolesPermissions: false,
  faqs: true,
  // Billing is SUPERADMIN-only server-side (require_admin_permission's role
  // list on _require_admin_billing excludes plain ADMIN) - false here even
  // though this is otherwise the "full admin" permission set.
  billing: false,
};

/** Superadmin: everything an admin has, plus admin-account management and
 * revenue/analytics (the only role the backend actually returns revenue
 * data for). */
const SUPERADMIN_PERMISSIONS: AppPermissions = {
  ...ADMIN_PERMISSIONS,
  adminManagement: true,
  analytics: true,
  rolesPermissions: true,
  billing: true,
};

/** Matches pre-RBAC employee drawer routes.
 * users: false — GET /admin/users is admin/superadmin-only server-side
 * (app/api/v1/endpoints/admin.py's require_admin); granting this in the UI
 * previously let employees reach a Customers screen that always 403'd.
 * Measurement collection (POST /employee/orders/{id}/measurement) is a real
 * part of an employee's job, but is reached via an "Update Measurement"
 * action on the order detail screen (orders module), not a separate
 * top-level nav item/permission — see the removed `measurements` module. */
const EMPLOYEE_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: false,
  orders: true,
  tailors: false,
  staff: false,
  applications: false,
  analytics: false,
  notifications: true,
  chat: true,
  settings: true,
  profile: true,
  cancellations: false,
  adminManagement: false,
  supportTickets: true,
  catalog: false,
  homepage: false,
  // Inventory is an admin/superadmin module - Bridge/employee has no use for
  // it. Matches Admin_Web, where EMPLOYEE_PERMISSIONS is built from ALL_FALSE
  // and never grants inventory (web + app parity).
  inventory: false,
  lookbook: false,
  broadcasts: false,
  deliveries: true,
  leave: true,
  offers: false,
  serviceAreas: false,
  auditLog: false,
  rolesPermissions: false,
  faqs: false,
  billing: false,
};

/** Matches pre-RBAC tailor drawer routes */
const TAILOR_PERMISSIONS: AppPermissions = {
  dashboard: true,
  users: false,
  orders: true,
  tailors: false,
  staff: false,
  applications: false,
  analytics: false,
  notifications: true,
  // Backend chat_v2 restricts session access to the session's own customer
  // or staff (admin/superadmin/employee) — see _get_authorized_session /
  // _STAFF_ROLES in app/api/v1/endpoints/chat_v2.py. Tailors have no
  // legitimate reason to reach any support session.
  chat: false,
  settings: true,
  profile: true,
  cancellations: false,
  adminManagement: false,
  supportTickets: true,
  catalog: false,
  homepage: false,
  // Backend explicitly allows TAILOR to GET /inventory and /inventory/{id}
  // (app/api/v1/endpoints/inventory.py: "TAILOR can also view inventory" —
  // read-only, writes stay ADMIN/SUPERADMIN/EMPLOYEE). The screen already
  // gates write controls behind canWrite (excludes tailor), so granting this
  // just makes the existing read-only path reachable.
  inventory: true,
  lookbook: false,
  broadcasts: true,
  deliveries: false,
  leave: true,
  offers: false,
  serviceAreas: false,
  auditLog: false,
  rolesPermissions: false,
  faqs: false,
  billing: false,
};

/** Most restrictive default — used when the role cannot be resolved at all. */
const NO_PERMISSIONS: AppPermissions = {
  dashboard: false,
  users: false,
  orders: false,
  tailors: false,
  staff: false,
  applications: false,
  analytics: false,
  notifications: false,
  chat: false,
  settings: false,
  profile: false,
  cancellations: false,
  adminManagement: false,
  supportTickets: false,
  catalog: false,
  homepage: false,
  inventory: false,
  lookbook: false,
  broadcasts: false,
  deliveries: false,
  leave: false,
  offers: false,
  serviceAreas: false,
  auditLog: false,
  rolesPermissions: false,
  faqs: false,
  billing: false,
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

  if (effectiveRole === 'superadmin') {
    return SUPERADMIN_PERMISSIONS;
  }

  if (effectiveRole === 'admin' || (userNorm === 'user' && selectedNorm === 'admin')) {
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

/**
 * Maps an RBAC screen_name (RBAC_SCREENS table, shared with the backend and
 * BMD-Admin web) to this app's AppPermissions key(s). Web's MODULES values
 * are literally identical to screen_name (e.g. "cms", "catalog"), but this
 * app's permission keys predate RBAC and don't all match 1:1 (e.g. "cms"
 * screen -> "homepage" key here, "employees" screen covers both "staff" and
 * "adminManagement" keys). Screens with no mobile-app equivalent
 * (cod_collection, chat_support, admin_dashboard, revenue_analytics,
 * financial_reports, my_account) are omitted — a revoke on one of those has
 * no drawer route to hide here.
 */
const RBAC_SCREEN_TO_MODULE: Partial<Record<string, (keyof AppPermissions)[]>> = {
  users: ['users'],
  tailors: ['tailors'],
  employees: ['staff', 'adminManagement'],
  orders: ['orders'],
  cms: ['homepage'],
  coupons: ['offers'],
  notifications: ['notifications'],
  support_tickets: ['supportTickets'],
  cancellations: ['cancellations'],
  catalog: ['catalog'],
  lookbook: ['lookbook'],
  service_areas: ['serviceAreas'],
  audit_log: ['auditLog'],
  roles_permissions: ['rolesPermissions'],
  support_faqs: ['faqs'],
  system_config: ['billing'],
};

/**
 * Merges a role's default module access with this specific account's
 * per-account RBAC overrides (mirrors BMD-Admin web's
 * mergeEffectivePermissions in constants/permissions.js, and the backend's
 * has_any_active_revoke_for_screen coarse screen-level gate). An L1
 * superadmin revoking ANY permission on a screen for this account hides
 * every mobile module mapped to that screen, regardless of role default.
 */
export const mergeEffectivePermissions = (
  userRole: UserRole | string | null | undefined,
  selectedRole: LoginRole | string | null | undefined,
  effective: EffectivePermissions | null | undefined,
): AppPermissions => {
  const base = { ...resolvePermissions(userRole, selectedRole) };
  if (!effective) return base;
  const revokedScreens = new Set(effective.explicit_revokes.map((r) => r.screen_name));
  for (const screenName of revokedScreens) {
    const keys = RBAC_SCREEN_TO_MODULE[screenName];
    if (!keys) continue;
    for (const key of keys) base[key] = false;
  }
  return base;
};

export const ROUTE_PERMISSION_MAP: Record<string, keyof AppPermissions> = {
  dashboard: 'dashboard',
  orders: 'orders',
  payments: 'orders',
  customers: 'users',
  tailors: 'tailors',
  employees: 'staff',
  admins: 'adminManagement',
  cancellations: 'cancellations',
  applications: 'applications',
  revenue: 'analytics',
  notifications: 'notifications',
  support: 'supportTickets',
  catalog: 'catalog',
  homepage: 'homepage',
  inventory: 'inventory',
  lookbook: 'lookbook',
  broadcasts: 'broadcasts',
  pickups: 'deliveries',
  deliveries: 'deliveries',
  leave: 'leave',
  settings: 'settings',
  profile: 'profile',
  offers: 'offers',
  'service-areas': 'serviceAreas',
  'audit-log': 'auditLog',
  'roles-permissions': 'rolesPermissions',
  faqs: 'faqs',
  billing: 'billing',
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
