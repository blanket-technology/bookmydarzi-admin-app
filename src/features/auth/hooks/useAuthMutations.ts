import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { roleMatchesSession } from '@/constants/roles';
import { getDefaultRouteForRole } from '@/constants/permissions';
import { useAuthContext } from '@/contexts/authContext';
import {
  authService,
  normalizeAuthUser,
} from '@/services/authService';
import { tokenStorage } from '@/services/tokenStorage';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { LoginRole } from '@/constants/roles';
import type {
  EmailLoginRequest,
  EmailSignupRequest,
  EmailVerifyOtpRequest,
  ForgotPasswordRequest,
  ForgotPasswordResetRequest,
  ForgotPasswordVerifyRequest,
} from '@/types/auth';
import type { ApiError } from '@/types/api';

const completeAuthSession = async (
  data: {
    access_token: string;
    refresh_token: string;
    user?: Record<string, unknown>;
  },
  selectedRole: LoginRole,
  login: ReturnType<typeof useAuthContext>['login'],
) => {
  await tokenStorage.setTokens(data.access_token, data.refresh_token);
  useAuthStore.getState().setTokens(data.access_token, data.refresh_token);

  let user = data.user ? normalizeAuthUser(data.user) : null;
  if (!user) {
    user = await authService.getCurrentUser();
  }

  if (!roleMatchesSession(selectedRole, user.role)) {
    useAuthStore.getState().logout();
    await tokenStorage.clearAll();
    throw {
      message: `This account is registered as ${user.role}. Please select the correct role.`,
      code: 'ROLE_MISMATCH',
    };
  }

  await login({
    user,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    selectedRole,
  });

  toast.success(`Welcome back, ${user.full_name ?? user.email ?? 'User'}!`);
  router.replace(getDefaultRouteForRole(user.role) as never);
};

export const useLoginMutation = () => {
  const { login } = useAuthContext();
  const setLoading = useAuthStore((s) => s.setLoading);

  return useMutation({
    mutationFn: (payload: EmailLoginRequest & { role: LoginRole }) =>
      authService.login({ email: payload.email, password: payload.password }),
    onMutate: () => setLoading(true),
    onSuccess: async (data, variables) => {
      await completeAuthSession(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user as unknown as Record<string, unknown> | undefined,
        },
        variables.role,
        login,
      );
    },
    onSettled: () => setLoading(false),
  });
};

export const useSignupMutation = () =>
  useMutation({
    mutationFn: (payload: EmailSignupRequest) => authService.signup(payload),
    onSuccess: (_, variables) => {
      toast.info('OTP sent to your email');
      router.push({
        pathname: '/(auth)/otp-verification',
        params: { email: variables.email },
      });
    },
  });

export const useVerifyOtpMutation = () => {
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: (payload: EmailVerifyOtpRequest & { role?: LoginRole }) =>
      authService.verifyEmailOtp(payload),
    onSuccess: async (data, variables) => {
      const role = variables.role ?? 'admin';
      await completeAuthSession(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user as unknown as Record<string, unknown> | undefined,
        },
        role,
        login,
      );
    },
  });
};

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

export const getMutationError = (error: unknown): string => {
  const apiError = error as ApiError;
  return apiError?.message ?? 'Something went wrong';
};
