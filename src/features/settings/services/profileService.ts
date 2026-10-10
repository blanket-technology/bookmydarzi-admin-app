import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UserProfile {
  Id?: string;
  UserCode?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Email?: string;
  Mobile?: string;
  Role?: string;
  ProfileImageUrl?: string;
  Gender?: string;
  IsEmailVerified?: boolean;
  IsMobileVerified?: boolean;
}

export interface RequestEmailChangePayload {
  new_email: string;
  password?: string;
}

export interface VerifyEmailChangePayload {
  new_email: string;
  otp: string;
}

export interface RequestMobileChangePayload {
  new_mobile: string;
  password: string;
}

export interface VerifyMobileChangePayload {
  new_mobile: string;
  otp: string;
}

export const profileService = {
  getProfile: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>(ENDPOINTS.USERS.PROFILE);
    return data;
  },

  updateProfile: async (payload: Partial<UserProfile>) => {
    const { data } = await apiClient.patch(ENDPOINTS.USERS.PROFILE, payload);
    return data;
  },

  uploadProfilePhoto: async (file: { uri: string; fileName?: string; mimeType?: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'profile_photo.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ profile_image_url: string; storage: string }>(
      ENDPOINTS.USERS.PROFILE_PHOTO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  // Stores a portfolio image and returns its URL WITHOUT touching the profile photo
  // (the profile-photo route replaces the avatar and deletes the previous file).
  uploadPortfolioImage: async (file: { uri: string; fileName?: string; mimeType?: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'portfolio.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id: string }>(
      ENDPOINTS.TAILOR.PORTFOLIO_UPLOAD,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 },
    );
    return data;
  },

  changePassword: async (payload: ChangePasswordRequest) => {
    // Backend route is PATCH /users/change-password (app/api/v1/endpoints/
    // users.py) - POST returns 405 Method Not Allowed.
    const { data } = await apiClient.patch(ENDPOINTS.USERS.CHANGE_PASSWORD, payload);
    return data;
  },

  // Email change - 2 steps: request (sends OTP to the NEW email), verify.
  requestEmailChange: async (payload: RequestEmailChangePayload) => {
    const { data } = await apiClient.post<{ message: string; expires_in_seconds: number }>(
      ENDPOINTS.USERS.CHANGE_EMAIL_REQUEST,
      payload,
    );
    return data;
  },
  verifyEmailChange: async (payload: VerifyEmailChangePayload) => {
    const { data } = await apiClient.post<{ message: string; new_email: string }>(
      ENDPOINTS.USERS.CHANGE_EMAIL_VERIFY,
      payload,
    );
    return data;
  },

  // Mobile change - 4 backend steps chained behind one UI flow: verify
  // password + OTP to CURRENT mobile, then OTP to NEW mobile + verify.
  // Step 1's schema requires new_mobile even though the service function
  // (request_mobile_change_current) never reads it - the UI collects the
  // new number upfront (needed for step 3 anyway) and passes it through
  // here too, rather than sending a placeholder value.
  requestCurrentMobileOtp: async (newMobile: string, password: string) => {
    const { data } = await apiClient.post<{ message: string; expires_in_seconds: number }>(
      ENDPOINTS.USERS.CHANGE_MOBILE_CURRENT_REQUEST,
      { new_mobile: newMobile, password },
    );
    return data;
  },
  verifyCurrentMobileOtp: async (otp: string) => {
    const { data } = await apiClient.post<{ message: string }>(
      ENDPOINTS.USERS.CHANGE_MOBILE_CURRENT_VERIFY,
      { otp },
    );
    return data;
  },
  requestMobileChange: async (payload: RequestMobileChangePayload) => {
    const { data } = await apiClient.post<{ message: string; expires_in_seconds: number }>(
      ENDPOINTS.USERS.CHANGE_MOBILE_REQUEST,
      payload,
    );
    return data;
  },
  verifyMobileChange: async (payload: VerifyMobileChangePayload) => {
    const { data } = await apiClient.post<{ message: string; new_mobile: string }>(
      ENDPOINTS.USERS.CHANGE_MOBILE_VERIFY,
      payload,
    );
    return data;
  },
};
