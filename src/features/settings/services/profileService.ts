import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UserProfile {
  Id?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Email?: string;
  Mobile?: string;
  Role?: string;
  ProfileImageUrl?: string;
  Gender?: string;
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

  changePassword: async (payload: ChangePasswordRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.USERS.CHANGE_PASSWORD, payload);
    return data;
  },
};
