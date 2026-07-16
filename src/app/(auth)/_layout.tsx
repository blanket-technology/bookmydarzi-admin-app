import { Redirect, Stack } from 'expo-router';
import { Loader } from '@/components/ui';
import { getDefaultRouteForRole } from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { isAuthenticated, isInitialized, isHydrated, user, selectedRole } = useAuth();

  if (!isHydrated || !isInitialized) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Redirect href={getDefaultRouteForRole(user?.role, selectedRole) as never} />;
  }
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="otp-verification" />
    </Stack>
  );
}
