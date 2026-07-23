import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AuthTokenResponse,
  AuthUser,
  EmailLoginRequest,
  EmailLoginResponse,
  EmailLoginVerifyOtpRequest,
  EmailResendOtpRequest,
  ForgotPasswordRequest,
  ForgotPasswordResetRequest,
  ForgotPasswordVerifyRequest,
  RefreshTokenRequest,
  UserRole,
} from '@/types/auth';
import { isOtpRequiredResponse } from '@/types/auth';

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
  // Staff accounts (admin/superadmin/employee/tailor — every role this app
  // serves) require a second factor: a correct password returns
  // { otp_required: true, ... } instead of tokens. Callers must check
  // isOtpRequiredResponse() on the result before assuming tokens are present.
  login: async (payload: EmailLoginRequest): Promise<EmailLoginResponse> => {
    const { data } = await apiClient.post<Record<string, unknown>>(ENDPOINTS.AUTH.LOGIN, payload);
    if (isOtpRequiredResponse(data)) {
      return data as unknown as EmailLoginResponse;
    }
    const normalized = normalizeTokenResponse(data);
    if (!normalized.access_token) {
      throw { message: 'Login response missing access_token', code: 'INVALID_LOGIN_RESPONSE' };
    }
    return normalized;
  },

  verifyLoginOtp: async (payload: EmailLoginVerifyOtpRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.AUTH.LOGIN_VERIFY_OTP,
      payload,
    );
    const normalized = normalizeTokenResponse(data);
    if (!normalized.access_token) {
      throw { message: 'Verification response missing access_token', code: 'INVALID_OTP_RESPONSE' };
    }
    return normalized;
  },

  resendLoginOtp: async (payload: EmailResendOtpRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.LOGIN_RESEND_OTP, payload);
    return data;
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
    const { data } = await apiClient.get<Record<string, unknown>>(ENDPOINTS.USERS.PROFILE);
    return normalizeAuthUser(data);
  },
};
