export type UserRole = 'user' | 'tailor' | 'employee' | 'admin' | 'superadmin';

export interface AuthUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  full_name?: string;
  mobile?: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  is_mobile_verified: boolean;
  profile_image?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  is_new_user?: boolean;
  user?: AuthUser;
}

/**
 * Returned by POST /auth/email/login instead of tokens when the account's
 * role requires a second factor (admin/superadmin/employee/tailor — every
 * role this app serves). The password has already been verified; complete
 * login with POST /auth/email/login/verify-otp.
 */
export interface LoginOtpRequiredResponse {
  otp_required: true;
  email: string;
  expires_in_seconds: number;
  resends_remaining: number;
  cooldown_seconds: number;
  message: string;
}

export type EmailLoginResponse = AuthTokenResponse | LoginOtpRequiredResponse;

export const isOtpRequiredResponse = (
  data: EmailLoginResponse | Record<string, unknown>,
): data is LoginOtpRequiredResponse => Boolean((data as LoginOtpRequiredResponse)?.otp_required);

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface EmailLoginVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  mobile?: string;
}

export interface ForgotPasswordVerifyRequest {
  otp: string;
  email?: string;
  mobile?: string;
}

export interface ForgotPasswordResetRequest {
  reset_token: string;
  new_password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface EmailResendOtpRequest {
  email: string;
}
