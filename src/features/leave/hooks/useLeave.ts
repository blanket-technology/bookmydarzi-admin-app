import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { leaveService } from '@/services/leaveService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type {
  ApproveLeaveRequestPayload,
  CreateLeaveRequestPayload,
  LeaveRequestListParams,
  RejectLeaveRequestPayload,
} from '@/types/leave';

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

// ─── Admin review (admin/superadmin only) ──────────────────────────────────

export const useAdminLeaveRequests = (params?: LeaveRequestListParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ADMIN_LEAVE_REQUESTS(params as Record<string, unknown>),
    queryFn: () => leaveService.adminList(params),
    enabled,
  });

export const useApproveLeaveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload?: ApproveLeaveRequestPayload }) =>
      leaveService.adminApprove(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      toast.success('Leave request approved');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useRejectLeaveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: RejectLeaveRequestPayload }) =>
      leaveService.adminReject(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      toast.success('Leave request rejected');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
