import { z } from 'zod';

// No role field — the server is the sole source of truth for a user's role
// (via the JWT / GET /users/profile). Staff accounts are provisioned via
// the admin panel, not self-signup, so there is no signup flow in this app.
// Mirrors the backend's password rules (password_service._validate_password):
// at least 8 here (stricter than the server's 6), one uppercase letter, one digit.
export const newPasswordRule = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/\d/, 'Include at least one number');

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  // Trim + lowercase first: a trailing space from the keyboard is not a typo.
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
