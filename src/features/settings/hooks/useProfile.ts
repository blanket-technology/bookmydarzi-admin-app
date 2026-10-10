import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import {
  profileService,
  type ChangePasswordRequest,
  type RequestEmailChangePayload,
  type RequestMobileChangePayload,
  type UserProfile,
  type VerifyEmailChangePayload,
  type VerifyMobileChangePayload,
} from '@/features/settings/services/profileService';

export const useProfile = () =>
  useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: profileService.getProfile,
  });

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<UserProfile>) =>
      profileService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
};

export const useChangePasswordMutation = () =>
  useMutation({
    mutationFn: (payload: ChangePasswordRequest) =>
      profileService.changePassword(payload),
  });

export const useUploadProfilePhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; fileName?: string; mimeType?: string }) =>
      profileService.uploadProfilePhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
};

export const useUploadPortfolioImageMutation = () =>
  useMutation({
    mutationFn: (file: { uri: string; fileName?: string; mimeType?: string }) =>
      profileService.uploadPortfolioImage(file),
  });

export const useRequestEmailChangeMutation = () =>
  useMutation({
    mutationFn: (payload: RequestEmailChangePayload) => profileService.requestEmailChange(payload),
  });

export const useVerifyEmailChangeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyEmailChangePayload) => profileService.verifyEmailChange(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
};

export const useRequestCurrentMobileOtpMutation = () =>
  useMutation({
    mutationFn: ({ newMobile, password }: { newMobile: string; password: string }) =>
      profileService.requestCurrentMobileOtp(newMobile, password),
  });

export const useVerifyCurrentMobileOtpMutation = () =>
  useMutation({
    mutationFn: (otp: string) => profileService.verifyCurrentMobileOtp(otp),
  });

export const useRequestMobileChangeMutation = () =>
  useMutation({
    mutationFn: (payload: RequestMobileChangePayload) => profileService.requestMobileChange(payload),
  });

export const useVerifyMobileChangeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyMobileChangePayload) => profileService.verifyMobileChange(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
};
