import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { applicationService } from '@/services/applicationService';
import type { ApplicationsQueryParams, RejectApplicationRequest } from '@/types/applications';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

export const useApplications = (
  params?: ApplicationsQueryParams,
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS(params as Record<string, unknown>),
    queryFn: () => applicationService.getApplications(params),
    enabled,
  });

export const useApplication = (applicationId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.APPLICATION(applicationId),
    queryFn: () => applicationService.getApplication(applicationId),
    enabled: enabled && !!applicationId,
  });

export const useApproveApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      overridePanRequirement,
      panWaiverReason,
    }: {
      applicationId: string;
      overridePanRequirement?: boolean;
      panWaiverReason?: string;
    }) => applicationService.approveApplication(applicationId, { overridePanRequirement, panWaiverReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Application approved');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useRejectApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: RejectApplicationRequest;
    }) => applicationService.rejectApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Application rejected');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
