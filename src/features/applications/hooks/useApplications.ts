import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { applicationService } from '@/services/applicationService';
import type {
  ApplicationsQueryParams,
  CreateTailorApplicationRequest,
  RejectApplicationRequest,
} from '@/types/applications';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';
import { trackTailorApplicationSubmitted } from '@/services/mixpanelService';

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
      // The detail screen reads ['application', id] (a different key) and approval
      // creates a tailor, so both of those would otherwise show stale data.
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: ['tailors'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Application approved');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useCreateApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTailorApplicationRequest) =>
      applicationService.createApplication(payload),
    onSuccess: (data) => {
      trackTailorApplicationSubmitted({ application_id: data.application_id });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Tailor application submitted - approve it here to create the account');
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
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Application rejected');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
