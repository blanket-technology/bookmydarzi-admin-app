import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { cancellationService } from '@/services/cancellationService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type {
  CancellationApproveRequest,
  CancellationPatchRequest,
  CancellationPolicyUpdate,
  CancellationRejectRequest,
  CancellationsQueryParams,
} from '@/types/cancellations';

export const useCancellations = (params?: CancellationsQueryParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CANCELLATIONS(params as Record<string, unknown>),
    queryFn: () => cancellationService.list(params),
    enabled,
  });

export const useCancellation = (id: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CANCELLATION(id),
    queryFn: () => cancellationService.getById(id),
    enabled: enabled && !!id,
  });

export const useApproveCancellationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancellationApproveRequest }) =>
      cancellationService.approve(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cancellations'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CANCELLATION(variables.id) });
      toast.success('Cancellation approved');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useRejectCancellationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancellationRejectRequest }) =>
      cancellationService.reject(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cancellations'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CANCELLATION(variables.id) });
      toast.success('Cancellation rejected');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const usePatchCancellationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancellationPatchRequest }) =>
      cancellationService.patch(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cancellations'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CANCELLATION(variables.id) });
      toast.success('Cancellation updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCancellationPolicy = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CANCELLATION_POLICY,
    queryFn: () => cancellationService.getPolicy(),
    enabled,
  });

export const useUpdateCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, payload }: { stage: string; payload: CancellationPolicyUpdate }) =>
      cancellationService.updatePolicyStage(stage, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CANCELLATION_POLICY });
      toast.success('Policy updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
