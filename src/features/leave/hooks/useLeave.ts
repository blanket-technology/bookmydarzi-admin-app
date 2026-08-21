import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { leaveService } from '@/services/leaveService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { CreateLeaveRequestPayload } from '@/types/leave';

export const useMyLeaveRequests = () =>
  useQuery({
    queryKey: QUERY_KEYS.LEAVE_REQUESTS(),
    queryFn: () => leaveService.listMine(),
  });

export const useCreateLeaveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeaveRequestPayload) => leaveService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEAVE_REQUESTS() });
      toast.success('Leave request submitted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCancelLeaveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => leaveService.cancel(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEAVE_REQUESTS() });
      toast.info('Leave request withdrawn');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
