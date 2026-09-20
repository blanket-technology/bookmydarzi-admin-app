import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { serviceAreasService } from '@/services/serviceAreasService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { ServiceAreaCreateRequest, ServiceAreaUpdateRequest } from '@/types/serviceAreas';

export const useServiceAreas = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_AREAS,
    queryFn: () => serviceAreasService.list(),
    enabled,
  });

export const useCreateServiceAreaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceAreaCreateRequest) => serviceAreasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_AREAS });
      toast.success('Service area created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateServiceAreaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ServiceAreaUpdateRequest }) =>
      serviceAreasService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_AREAS });
      toast.success('Service area updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteServiceAreaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviceAreasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_AREAS });
      toast.success('Service area removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Read-only "notify me" lead list - mirrors final's ServiceAreasPage.jsx's
// interests tab.
export const useServiceAreaInterests = (skip: number, limit: number, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_AREA_INTERESTS({ skip, limit }),
    queryFn: () => serviceAreasService.listInterests({ skip, limit }),
    enabled,
  });
