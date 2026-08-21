import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppPermissions } from '@/constants/permissions';
import type { LoginRole } from '@/constants/roles';
import { STORAGE_KEYS } from '@/constants/storage';
import { tokenStorage } from '@/services/tokenStorage';
import type { AuthUser } from '@/types/auth';
import { secureStorage } from '@/utils/secureStorage';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedRole: LoginRole | null;
  // Role default merged with this account's per-account RBAC overrides (see
  // Settings > Admin Access on web / (drawer)/admins/[id] here) — set at
  // login by completeAuthSession's effective-permissions fetch. null means
  // "not fetched yet" (e.g. session predates this feature) - usePermissions
  // falls back to resolvePermissions(role) in that case, identical to
  // previous behavior, so no session is ever left worse off than before.
  permissions: AppPermissions | null;
  loading: boolean;
  isHydrated: boolean;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  setSelectedRole: (role: LoginRole | null) => void;
  setPermissions: (permissions: AppPermissions | null) => void;
  setLoading: (loading: boolean) => void;
  login: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    selectedRole: LoginRole;
  }) => void;
  logout: () => void;
  refreshSession: (accessToken: string, refreshToken: string) => void;
  setHydrated: (value: boolean) => void;
}

const zustandStorage = {
  getItem: async (name: string) => {
    const value = await secureStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await secureStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await secureStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedRole: null,
      permissions: null,
      loading: false,
      isHydrated: false,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: !!accessToken }),

      setUser: (user) => set({ user }),

      setSelectedRole: (role) => set({ selectedRole: role }),

      setPermissions: (permissions) => set({ permissions }),

      setLoading: (loading) => set({ loading }),

      login: ({ user, accessToken, refreshToken, selectedRole }) => {
        void secureStorage.setItem(STORAGE_KEYS.SELECTED_ROLE, selectedRole);
        set({
          user,
          accessToken,
          refreshToken,
          selectedRole,
          isAuthenticated: true,
          loading: false,
        });
      },

      logout: () => {
        void tokenStorage.clearAll();
        void secureStorage.removeItem(STORAGE_KEYS.SELECTED_ROLE);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          selectedRole: null,
          permissions: null,
          isAuthenticated: false,
          loading: false,
        });
      },

      refreshSession: (accessToken, refreshToken) => {
        const current = get();
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          user: current.user,
          selectedRole: current.selectedRole,
        });
      },

      setHydrated: (value) => set({ isHydrated: value }),
    }),
    {
      name: 'bdm_auth_store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        selectedRole: state.selectedRole,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (__DEV__ && error) {
          console.warn('[authStore] rehydration error:', error);
        }
        // Always mark hydrated — never block boot if storage read fails
        useAuthStore.getState().setHydrated(true);
        if (__DEV__) {
          console.log('[authStore] rehydrated', {
            isAuthenticated: state?.isAuthenticated ?? false,
            hasUser: !!state?.user,
          });
        }
      },
    },
  ),
);

export const getAuthTokens = () => {
  const { accessToken, refreshToken } = useAuthStore.getState();
  return { accessToken, refreshToken };
};
