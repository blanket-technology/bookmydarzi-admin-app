import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getDefaultRouteForRole } from '@/constants/permissions';
import { useAuthContext } from '@/contexts/authContext';
import {
  authService,
  normalizeAuthUser,
} from '@/services/authService';
import { tokenStorage } from '@/services/tokenStorage';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type {
  EmailLoginRequest,
  EmailLoginVerifyOtpRequest,
  ForgotPasswordRequest,
  ForgotPasswordResetRequest,
  ForgotPasswordVerifyRequest,
} from '@/types/auth';
import { isOtpRequiredResponse } from '@/types/auth';
import { getMutationError } from '@/utils/errors';

export { getMutationError };

// There is no role selector on login — the server is the sole source of
// truth for a user's role (via the JWT / GET /users/profile), and routing
// is always computed from that, never from anything the client claimed.
const completeAuthSession = async (
  data: {
    access_token: string;
    refresh_token: string;
    user?: Record<string, unknown>;
  },
  login: ReturnType<typeof useAuthContext>['login'],
) => {
  await tokenStorage.setTokens(data.access_token, data.refresh_token);
  useAuthStore.getState().setTokens(data.access_token, data.refresh_token);

  let user = data.user ? normalizeAuthUser(data.user) : null;
  if (!user) {
    user = await authService.getCurrentUser();
  }

  await login({
    user,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  toast.success(`Welcome back, ${user.full_name ?? user.email ?? 'User'}!`);
  router.replace(getDefaultRouteForRole(user.role) as never);
};

export const useLoginMutation = () => {
  const { login } = useAuthContext();
  const setLoading = useAuthStore((s) => s.setLoading);

  return useMutation({
    mutationFn: (payload: EmailLoginRequest) => authService.login(payload),
    onMutate: () => setLoading(true),
    onSuccess: async (data, variables) => {
      // Every role this app serves (admin/superadmin/employee/tailor)
      // requires a second factor — a correct password returns
      // otp_required instead of tokens. Navigate to the login-OTP step
      // rather than treating this as a completed session.
      if (isOtpRequiredResponse(data)) {
        router.push({
          pathname: '/(auth)/login-otp-verification',
          params: {
            email: variables.email,
            cooldownSeconds: String(data.cooldown_seconds ?? 30),
          },
        });
        return;
      }

      await completeAuthSession(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user as unknown as Record<string, unknown> | undefined,
        },
        login,
      );
    },
    onSettled: () => setLoading(false),
  });
};

export const useLoginVerifyOtpMutation = () => {
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: (payload: EmailLoginVerifyOtpRequest) => authService.verifyLoginOtp(payload),
    onSuccess: async (data) => {
      await completeAuthSession(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user as unknown as Record<string, unknown> | undefined,
        },
        login,
      );
    },
  });
};

export const useResendLoginOtpMutation = () =>
  useMutation({
    mutationFn: (payload: { email: string }) =>
      authService.resendLoginOtp(payload) as Promise<{ cooldown_seconds?: number }>,
  });

export const useForgotPasswordRequestMutation = () =>
  useMutation({
    mutationFn: (payload: ForgotPasswordRequest) =>
      authService.forgotPasswordRequest(payload),
    onSuccess: () => toast.success('OTP sent successfully'),
  });

export const useForgotPasswordVerifyMutation = () =>
  useMutation({
    mutationFn: (payload: ForgotPasswordVerifyRequest) =>
      authService.forgotPasswordVerify(payload),
  });

export const useForgotPasswordResetMutation = () =>
  useMutation({
    mutationFn: (payload: ForgotPasswordResetRequest) =>
      authService.forgotPasswordReset(payload),
    onSuccess: () => {
      toast.success('Password reset successfully');
      router.replace('/(auth)/login');
    },
  });

export const useLogoutMutation = () => {
  const { logout } = useAuthContext();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      toast.info('Logged out');
      router.replace('/(auth)/login');
    },
  });
};
