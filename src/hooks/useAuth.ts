import { useAuthContext } from '@/contexts/authContext';

export const useAuth = () => {
  const context = useAuthContext();
  return {
    user: context.currentUser,
    isAuthenticated: context.isAuthenticated,
    loading: context.loading,
    isHydrated: context.isHydrated,
    isInitialized: context.isInitialized,
    selectedRole: context.selectedRole,
    login: context.login,
    logout: context.logout,
    refreshSession: context.refreshSession,
  };
};
