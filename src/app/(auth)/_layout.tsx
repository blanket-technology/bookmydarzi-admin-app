import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Loader } from '@/components/ui';
import { getDefaultRouteForRole, resolvePermissions } from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function AuthLayout() {
  const { isAuthenticated, isInitialized, isHydrated, user, selectedRole, logout } = useAuth();
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  // A session can be validly authenticated (real tokens) but belong to a
  // role this app has no screens for at all — e.g. a plain customer account
  // (role: "user") signing in here by mistake, or hitting a stale/mismatched
  // selectedRole after the account's role changed server-side. There is no
  // route this app can safely redirect an authenticated-but-permission-less
  // session to: '/(auth)/login' looks like the escape hatch, but since the
  // session IS authenticated, landing there just re-triggers this exact
  // redirect — an infinite loop (the bug this replaces). The only correct
  // recovery is to actually end the session.
  const roleResolved = Boolean(user?.role) || Boolean(selectedRole);
  const permissions = roleResolved ? resolvePermissions(user?.role, selectedRole) : null;
  const hasNoAccess = Boolean(
    permissions && !permissions.dashboard && !permissions.orders && !permissions.profile,
  );

  useEffect(() => {
    if (isAuthenticated && roleResolved && hasNoAccess) {
      toast.error("This account doesn't have access to the admin app.");
      void logout();
    }
  }, [isAuthenticated, roleResolved, hasNoAccess, logout]);

  if (!isHydrated || !isInitialized) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    // Tokens can flip isAuthenticated true a tick before `user`/`selectedRole`
    // finish restoring (refreshSession sets tokens and fetches the profile in
    // two separate store updates — see contexts/authContext.tsx refreshSession).
    // Wait for the role to actually resolve before deciding anything.
    if (!roleResolved) {
      return <Loader fullScreen message="Loading..." />;
    }
    if (hasNoAccess) {
      // logout() is in flight (see effect above) — show a loader instead of
      // computing a redirect target that doesn't exist for this role.
      return <Loader fullScreen message="Signing out..." />;
    }
    // Still on an admin-assigned default password (Tailor@123/Bridge@123) -
    // block the drawer shell entirely until it's changed. This screen lives
    // inside the (auth) stack (not the drawer) specifically so it's reachable
    // while authenticated but before hasNoAccess/role routing takes over.
    if (mustChangePassword) {
      return (
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="force-change-password" />
        </Stack>
      );
    }
    return <Redirect href={getDefaultRouteForRole(user?.role, selectedRole) as never} />;
  }
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="login-otp-verification" />
    </Stack>
  );
}
