import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { customerService } from '@/services/customerService';
import type { UserStatusUpdateRequest } from '@/types/users';
import { toast } from '@/store/toastStore';

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
    onError: () => toast.error('Failed to update user status'),
  });
};
