import { authService } from '@/services/authService';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { AuthTokenResponse } from '@/types/auth';

/**
 * Single in-flight /auth/refresh call, shared by every caller in the app
 * (axios.ts's 401 interceptor, authContext.tsx's boot-time session
 * restore). Without this, the two call independently with the same stored
 * refresh token whenever they land close together - e.g. app reopened
 * right as a queued request's access token expires. The backend tolerates
 * that race within a short grace window (see refresh_service.py), but a
 * cold-started/slow response can easily push the loser outside that
 * window, so the backend treats it as token theft and revokes the whole
 * session family - logging the user out even though nothing was stolen.
 * Routing every refresh through one promise removes the race entirely
 * instead of widening the window it has to survive.
 */
let inFlightRefresh: Promise<AuthTokenResponse> | null = null;

export const refreshAccessToken = (refreshToken: string): Promise<AuthTokenResponse> => {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = authService
    .refresh(refreshToken)
    .then(async (tokens) => {
      await tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
      useAuthStore.getState().refreshSession(tokens.access_token, tokens.refresh_token);
      return tokens;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
};
