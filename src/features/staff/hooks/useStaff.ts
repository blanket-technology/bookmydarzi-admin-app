import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { staffService } from '@/services/staffService';
import type { StaffCreateRequest } from '@/types/staff';
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
