import { Redirect, usePathname } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Loader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toastStore';

export const RoutePermissionGuard = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { user, selectedRole, logout } = useAuth();
  const { permissions, canAccessPath, defaultRoute } = usePermissions();

  // Session restore can briefly leave tokens set but the role not yet
  // resolved (see (auth)/_layout.tsx for the same race in refreshSession).
  // Wait for the role instead of computing access against an unresolved one.
  const roleResolved = Boolean(user?.role) || Boolean(selectedRole);

  // A role that resolves to no accessible module at all (e.g. a plain
  // customer account) has no legitimate destination in this app. defaultRoute
  // would be '/(auth)/login', but the session is still authenticated at this
  // point, so redirecting there just bounces straight back into the drawer —
  // looping against (auth)/_layout.tsx's own redirect. End the session
  // instead of trying to redirect somewhere that doesn't exist for this role.
  const hasNoAccess = Boolean(
    roleResolved && !permissions.dashboard && !permissions.orders && !permissions.profile,
  );

  useEffect(() => {
    if (roleResolved && hasNoAccess) {
      toast.error("This account doesn't have access to the admin app.");
      void logout();
    }
  }, [roleResolved, hasNoAccess, logout]);

  if (!roleResolved) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (hasNoAccess) {
    return <Loader fullScreen message="Signing out..." />;
  }

  if (!canAccessPath(pathname)) {
    return <Redirect href={defaultRoute as never} />;
  }

  return children;
};
