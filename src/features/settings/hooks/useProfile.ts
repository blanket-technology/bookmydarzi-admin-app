import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import {
  profileService,
  type ChangePasswordRequest,
  type UserProfile,
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
