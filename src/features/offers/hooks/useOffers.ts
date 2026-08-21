import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { offersService } from '@/services/offersService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { OfferCreateRequest, OfferUpdateRequest } from '@/types/offers';

export const useOffers = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.HOMEPAGE_OFFERS,
    queryFn: () => offersService.list(),
    enabled,
  });

export const useUploadOfferImageMutation = () =>
  useMutation({
    mutationFn: (file: { uri: string; fileName?: string; mimeType?: string }) =>
      offersService.uploadImage(file),
    onError: (error) => toast.error(getMutationError(error)),
  });

export const useCreateOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OfferCreateRequest) => offersService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_OFFERS });
      toast.success('Offer created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OfferUpdateRequest }) =>
      offersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_OFFERS });
      toast.success('Offer updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => offersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_OFFERS });
      toast.success('Offer removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
