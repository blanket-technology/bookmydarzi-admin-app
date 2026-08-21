import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { staffService } from '@/services/staffService';
import type { BridgeProfileUpdateRequest, StaffCreateRequest, StaffUpdateRequest } from '@/types/staff';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useStaff = (params?: { role?: string; search?: string }) =>
  useQuery({
    queryKey: QUERY_KEYS.STAFF(params),
    queryFn: () => staffService.getStaff(params),
  });

export const useCreateStaffMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffCreateRequest) => staffService.createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member created successfully');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useStaffMember = (id: string) =>
  useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffService.getStaffMember(id),
    enabled: !!id,
  });

const invalidateStaffMember = (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  queryClient.invalidateQueries({ queryKey: ['staff', id] });
  queryClient.invalidateQueries({ queryKey: ['staff'] });
};

export const useUpdateStaffMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffUpdateRequest) => staffService.updateStaff(id, payload),
    onSuccess: () => {
      invalidateStaffMember(queryClient, id);
      toast.success('Profile updated successfully!');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateBridgeProfileMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BridgeProfileUpdateRequest) => staffService.updateBridgeProfile(id, payload),
    onSuccess: () => {
      invalidateStaffMember(queryClient, id);
      toast.success('Profile updated successfully!');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useSetBridgeVerificationMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isApproved: boolean) => staffService.setBridgeVerification(id, isApproved),
    onSuccess: () => invalidateStaffMember(queryClient, id),
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUploadStaffKycMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      uri: string;
      fileName?: string;
      mimeType?: string;
      documentType: 'aadhar' | 'pan_card' | 'other';
    }) => staffService.uploadKyc(id, payload),
    onSuccess: () => {
      invalidateStaffMember(queryClient, id);
      toast.success('Document uploaded successfully');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
