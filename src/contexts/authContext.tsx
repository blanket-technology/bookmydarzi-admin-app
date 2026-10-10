import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginRole } from '@/constants/roles';
import {
  authService,
  normalizeAuthUser,
} from '@/services/authService';
import { STORAGE_KEYS } from '@/constants/storage';
import { unregisterPushTokenBestEffort } from '@/hooks/usePushRegistration';
import { refreshAccessToken } from '@/services/refreshCoordinator';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/types/auth';
import { isTransientApiError } from '@/utils/errors';
import { secureStorage } from '@/utils/secureStorage';

const SESSION_INIT_TIMEOUT_MS = 8_000;

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SESSION_INIT_TIMEOUT')), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isHydrated: boolean;
  loading: boolean;
  currentUser: AuthUser | null;
  selectedRole: LoginRole | null;
  login: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    mustChangePassword?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const selectedRole = useAuthStore((s) => s.selectedRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const storeLogin = useAuthStore((s) => s.login);
  const storeLogout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [isInitialized, setIsInitialized] = useState(false);
  const initCompletedRef = useRef(false);
  const sessionRestoredRef = useRef(false);

  const markInitialized = useCallback(() => {
    if (initCompletedRef.current) return;
    initCompletedRef.current = true;
    setLoading(false);
    setIsInitialized(true);
    if (__DEV__) {
      console.log('[AuthProvider] initialization complete', {
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        hasUser: !!useAuthStore.getState().user,
      });
    }
  }, [setLoading]);

  const login = useCallback(
    async (payload: {
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
      mustChangePassword?: boolean;
    }) => {
      await tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
      // There's no role selector to trust — selectedRole is derived from the
      // server-verified user.role and only ever used as a fallback while a
      // fresh session's user profile is still loading (see
      // constants/permissions.ts resolvePermissions). superadmin maps to the
      // 'admin' LoginRole since resolvePermissions already grants them
      // identical (full) permissions everywhere.
      const derivedRole: LoginRole = payload.user.role === 'superadmin' ? 'admin' : (payload.user.role as LoginRole);
      storeLogin({ ...payload, selectedRole: derivedRole });
    },
    [storeLogin],
  );

  const logout = useCallback(async () => {
    const { refreshToken, accessToken } = useAuthStore.getState();
    // Unregister this device's push token first, while the session is still valid.
    await withTimeout(unregisterPushTokenBestEffort(), 3_000).catch(() => undefined);
    if (refreshToken) {
      try {
        await withTimeout(authService.logout(refreshToken, accessToken), 5_000);
      } catch {
        // proceed with local logout even if API is unavailable
      }
    }
    storeLogout();
    await tokenStorage.clearAll();
  }, [storeLogout]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken =
      useAuthStore.getState().refreshToken ?? (await tokenStorage.getRefreshToken());

    if (!refreshToken) {
      await logout();
      return false;
    }

    try {
      // Routed through the shared coordinator (not authService.refresh
      // directly) so this boot-time refresh joins any refresh axios.ts's
      // 401 interceptor may already have in flight, instead of racing it
      // with the same refresh token - see refreshCoordinator.ts. The
      // coordinator already persists the new tokens on success.
      const data = await withTimeout(refreshAccessToken(refreshToken), SESSION_INIT_TIMEOUT_MS);

      if (data.user) {
        setUser(normalizeAuthUser(data.user as unknown as Record<string, unknown>));
      } else if (!useAuthStore.getState().user) {
        const profile = await withTimeout(authService.getCurrentUser(), SESSION_INIT_TIMEOUT_MS);
        setUser(profile);
      }

      return true;
    } catch (error) {
      // A timeout/network failure here means we don't know whether the
      // refresh token is actually invalid - it may well still be good.
      // Logging out on this is how a slow/cold-starting backend (Railway
      // hobby tier, documented in axios.ts) turned into a false "session
      // expired" for users who never did anything wrong. Only an actual
      // rejection from the server (expired/revoked token) should log out;
      // a transient failure should leave the existing session alone and
      // let the next authenticated request's own 401 handling (axios.ts,
      // which does retry network errors before giving up) take it from
      // here.
      const isTimeout = error instanceof Error && error.message === 'SESSION_INIT_TIMEOUT';
      const isNetworkError = isTransientApiError(error);

      if (__DEV__) {
        console.warn('[AuthProvider] refreshSession failed', error, { isTimeout, isNetworkError });
      }

      if (isTimeout || isNetworkError) {
        return false;
      }

      await logout();
      return false;
    }
  }, [logout, setUser]);

  // Fallback: never block app boot if zustand persist hydration stalls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().isHydrated) {
        if (__DEV__) {
          console.warn('[AuthProvider] hydration timeout — forcing isHydrated=true');
        }
        setHydrated(true);
      }
    }, 3_000);

    return () => clearTimeout(timer);
  }, [setHydrated]);

  useEffect(() => {
    if (!isHydrated || sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    if (__DEV__) {
      console.log('[AuthProvider] starting session restore');
    }

    const initTimeout = setTimeout(() => {
      if (__DEV__) {
        console.warn('[AuthProvider] session restore timeout — continuing without blocking UI');
      }
      markInitialized();
    }, SESSION_INIT_TIMEOUT_MS + 1_000);

    const initializeSession = async () => {
      setLoading(true);
      try {
        // Single-session enforcement: if the user logged in with "Remember me"
        // unchecked, their session must not survive an app restart. Clearing
        // here (before any token read below) turns the persisted tokens into a
        // no-op for this launch. Absent flag => 'true' (keep session), so
        // sessions predating this flag are never logged out.
        const rememberMe = await secureStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        if (rememberMe === 'false') {
          storeLogout();
          await tokenStorage.clearAll();
          markInitialized();
          return;
        }

        const storedAccessToken = await tokenStorage.getAccessToken();
        const storedRefreshToken = await tokenStorage.getRefreshToken();
        const { refreshToken, accessToken, isAuthenticated: authed, user: storedUser } =
          useAuthStore.getState();
        const activeRefreshToken = refreshToken ?? storedRefreshToken;

        if (__DEV__) {
          console.log('[AuthProvider] token audit', {
            storeAccessToken: accessToken ? `${accessToken.slice(0, 8)}...` : null,
            storeRefreshToken: refreshToken ? `${refreshToken.slice(0, 8)}...` : null,
            secureAccessToken: storedAccessToken ? `${storedAccessToken.slice(0, 8)}...` : null,
            secureRefreshToken: storedRefreshToken ? `${storedRefreshToken.slice(0, 8)}...` : null,
            isAuthenticated: authed,
          });
        }

        if (activeRefreshToken && (authed || accessToken)) {
          await refreshSession();
        } else if (accessToken && authed && !storedUser) {
          try {
            const profile = await withTimeout(
              authService.getCurrentUser(),
              SESSION_INIT_TIMEOUT_MS,
            );
            setUser(profile);
          } catch (error) {
            if (__DEV__) {
              console.warn('[AuthProvider] profile restore failed', error);
            }
            await logout();
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[AuthProvider] session restore error', error);
        }
      } finally {
        clearTimeout(initTimeout);
        markInitialized();
      }
    };

    void initializeSession();

    return () => {
      clearTimeout(initTimeout);
    };
  }, [isHydrated, logout, markInitialized, refreshSession, setLoading, setUser, storeLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isInitialized,
      isHydrated,
      loading,
      currentUser: user,
      selectedRole,
      login,
      logout,
      refreshSession,
    }),
    [
      isAuthenticated,
      isInitialized,
      isHydrated,
      loading,
      user,
      selectedRole,
      login,
      logout,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
