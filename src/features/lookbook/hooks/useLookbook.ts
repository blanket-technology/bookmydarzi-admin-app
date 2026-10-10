import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { lookbookService } from '@/services/lookbookService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { LookbookCreateRequest, LookbookUpdateRequest } from '@/types/lookbook';

export const useLookbookAdmin = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.LOOKBOOK(),
    queryFn: () => lookbookService.listAdmin(),
    enabled,
  });

export const useCreateLookbookItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LookbookCreateRequest) => lookbookService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook'] });
      toast.success('Lookbook item created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateLookbookItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LookbookUpdateRequest }) =>
      lookbookService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook'] });
      toast.success('Lookbook item updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteLookbookItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lookbookService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook'] });
      toast.success('Lookbook item removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUploadLookbookImageMutation = () =>
  useMutation({
    mutationFn: (file: { uri: string; fileName?: string; mimeType?: string }) => lookbookService.uploadImage(file),
    onError: (error) => toast.error(getMutationError(error)),
  });
