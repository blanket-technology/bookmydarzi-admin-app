// Mirrors app/schemas/user_screen_permission_schema.py on the backend and
// BMD-Admin's AdminAccessSection.jsx on web — this is the mobile-app version
// of the same L1 (superadmin) -> L2 (admin) per-account permission override
// feature, built against the same GET /rbac/user-permissions/{id}/effective
// and GET|POST /rbac/screens, /rbac/permissions endpoints.

export interface RbacScreen {
  id: number;
  screen_name: string;
  app: string;
  module: string;
  route_path: string;
  description?: string;
  is_active: boolean;
}

export interface RbacPermission {
  id: number;
  permission_name: string;
  description?: string;
}

export interface RoleDefaultScreen {
  screen_id: number;
  screen_name: string;
  app: string;
  module: string;
  route_path: string;
  permissions: string[];
}

export interface AccountOverrideScreen {
  screen_id: number;
  screen_name: string;
  permissions: string[];
  // Present when the backend includes per-permission mapping ids (needed to
  // clear a specific override row) — see AdminAccessSection.jsx's
  // handleReset, which reads permission_entries[].id.
  permission_entries?: { id: number; permission_name: string }[];
}

export interface ExplicitRevoke {
  id: number;
  screen_name: string;
  permission_name: string;
}

export interface EffectivePermissions {
  user_id: number;
  role_name: string;
  role_default_screens: RoleDefaultScreen[];
  account_overrides: AccountOverrideScreen[];
  explicit_revokes: ExplicitRevoke[];
}

export interface LockoutStatus {
  user_id: number;
  email: string;
  locked: boolean;
  failed_attempts: number;
  retry_after_seconds: number | null;
}

export type PermissionCellState = 'granted-role' | 'granted-override' | 'revoked' | 'none';

export interface UserScreenPermissionRow {
  id: number;
  user_id: number;
  screen_id: number;
  permission_id: number;
  is_active: boolean;
  granted_by?: number | null;
  created_at?: string;
  updated_at?: string | null;
}
