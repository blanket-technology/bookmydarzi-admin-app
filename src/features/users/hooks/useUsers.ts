import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { authService } from '@/services/authService';
import { customerService, userPhotoService } from '@/services/customerService';
import type { UserStatusUpdateRequest } from '@/types/users';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

// Shared across roles (tailor/employee/customer detail screens) — targets
// USERS.Id directly via POST /admin/users/{id}/photo, not a role-specific
// endpoint. `invalidateKeys` lets each caller invalidate its own detail
// query (['tailor', id] vs ['staff', id] vs QUERY_KEYS.USER(id)).
export const useUploadUserPhotoMutation = (userId: string, invalidateKeys: readonly unknown[][]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { uri: string; fileName?: string; mimeType?: string }) =>
      userPhotoService.upload(userId, payload),
    onSuccess: () => {
      for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
      toast.success('Photo updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUsers = (
  params?: { search?: string; page?: number; limit?: number },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.USERS(params),
    queryFn: () => customerService.getCustomers(params),
    enabled,
  });

export const useUser = (userId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.USER(userId),
    queryFn: () => customerService.getCustomer(userId),
    enabled: enabled && !!userId,
  });

export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UserStatusUpdateRequest;
    }) => customerService.updateStatus(userId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(
        variables.payload.action === 'activate'
          ? 'User activated successfully'
          : 'User deactivated successfully',
      );
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCustomerFullDetail = (userId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_FULL_DETAIL(userId),
    queryFn: () => customerService.getFullDetail(userId),
    enabled: enabled && !!userId,
  });

// Real reset flow, not a fake alert - triggers the same "send OTP/reset
// email" the customer would trigger themselves via Forgot Password, keyed
// off the admin knowing the account's email (mirrors BMD-Admin web's
// UserDetailPage.jsx handleResetPassword, which calls the same endpoint).
export const useResetCustomerPasswordMutation = () =>
  useMutation({
    mutationFn: (email: string) => authService.forgotPasswordRequest({ email }),
    onSuccess: () => toast.success('Password reset email sent'),
    onError: (error) => toast.error(getMutationError(error)),
  });

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => customerService.deleteCustomer(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Customer deleted');
      router.back();
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
