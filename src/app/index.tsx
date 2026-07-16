import { Redirect } from 'expo-router';
import { Loader } from '@/components/ui';
import { getDefaultRouteForRole } from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, isInitialized, isHydrated, user, selectedRole } = useAuth();

  if (!isHydrated || !isInitialized) {
    return <Loader fullScreen message="Restoring session..." />;
  }

  if (isAuthenticated) {
    return <Redirect href={getDefaultRouteForRole(user?.role, selectedRole) as never} />;
  }

  return <Redirect href="/(auth)/login" />;
}
