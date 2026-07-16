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

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface EmailSignupRequest {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password: string;
}

export interface EmailVerifyOtpRequest {
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

export interface MobileRequestOtpRequest {
  mobile: string;
}

export interface MobileVerifyOtpRequest {
  mobile: string;
  otp: string;
}

export interface EmailResendOtpRequest {
  email: string;
}
