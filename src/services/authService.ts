import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AuthTokenResponse,
  AuthUser,
  EmailLoginRequest,
  EmailResendOtpRequest,
  EmailSignupRequest,
  EmailVerifyOtpRequest,
  ForgotPasswordRequest,
  ForgotPasswordResetRequest,
  ForgotPasswordVerifyRequest,
  MobileRequestOtpRequest,
  MobileVerifyOtpRequest,
  RefreshTokenRequest,
  UserRole,
} from '@/types/auth';

const toString = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

export const normalizeTokenResponse = (raw: Record<string, unknown>): AuthTokenResponse => ({
  access_token: String(raw.access_token ?? raw.accessToken ?? raw.token ?? ''),
  refresh_token: String(raw.refresh_token ?? raw.refreshToken ?? ''),
  token_type: toString(raw.token_type ?? raw.tokenType),
  user: raw.user ? normalizeAuthUser(raw.user as Record<string, unknown>) : undefined,
});

export const normalizeAuthUser = (raw: Record<string, unknown>): AuthUser => ({
  id: toString(raw.id ?? raw.Id) ?? '',
  first_name: toString(raw.first_name ?? raw.FirstName),
  last_name: toString(raw.last_name ?? raw.LastName),
  email: toString(raw.email ?? raw.Email),
  full_name: toString(raw.full_name ?? raw.FullName),
  mobile: toString(raw.mobile ?? raw.Mobile),
  role: (toString(raw.role ?? raw.Role) ?? 'user') as UserRole,
  is_active: Boolean(raw.is_active ?? raw.IsActive ?? true),
  is_email_verified: Boolean(raw.is_email_verified ?? raw.IsEmailVerified ?? false),
  is_mobile_verified: Boolean(raw.is_mobile_verified ?? raw.IsMobileVerified ?? false),
  profile_image: toString(raw.profile_image ?? raw.ProfileImageUrl ?? raw.ProfileImage),
});

export const authService = {
  login: async (payload: EmailLoginRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<Record<string, unknown>>(ENDPOINTS.AUTH.LOGIN, payload);
    const normalized = normalizeTokenResponse(data);
    if (!normalized.access_token) {
      throw { message: 'Login response missing access_token', code: 'INVALID_LOGIN_RESPONSE' };
    }
    return normalized;
  },

  refresh: async (refreshToken: string): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.AUTH.REFRESH,
      { refresh_token: refreshToken } satisfies RefreshTokenRequest,
    );
    const normalized = normalizeTokenResponse(data);
    if (!normalized.access_token) {
      throw { message: 'Refresh response missing access_token', code: 'INVALID_REFRESH_RESPONSE' };
    }
    return normalized;
  },

  logout: async (refreshToken: string) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refresh_token: refreshToken });
    return data;
  },

  signup: async (payload: EmailSignupRequest) => {
    const { data } = await apiClient.post<{ message: string }>(ENDPOINTS.AUTH.SIGNUP, payload);
    return data;
  },

  verifyEmailOtp: async (payload: EmailVerifyOtpRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<AuthTokenResponse>(ENDPOINTS.AUTH.VERIFY_OTP, payload);
    return data;
  },

  resendEmailOtp: async (payload: EmailResendOtpRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.RESEND_OTP, payload);
    return data;
  },

  requestMobileOtp: async (payload: MobileRequestOtpRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.MOBILE_REQUEST_OTP, payload);
    return data;
  },

  verifyMobileOtp: async (payload: MobileVerifyOtpRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<AuthTokenResponse>(
      ENDPOINTS.AUTH.MOBILE_VERIFY_OTP,
      payload,
    );
    return data;
  },

  forgotPasswordRequest: async (payload: ForgotPasswordRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST, payload);
    return data;
  },

  forgotPasswordVerify: async (payload: ForgotPasswordVerifyRequest) => {
    const { data } = await apiClient.post<{ reset_token: string }>(
      ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY,
      payload,
    );
    return data;
  },

  forgotPasswordReset: async (payload: ForgotPasswordResetRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_RESET, payload);
    return data;
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<Record<string, unknown>>(ENDPOINTS.USERS.ME);
    return normalizeAuthUser(data);
  },
};
