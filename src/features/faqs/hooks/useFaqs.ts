import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { faqService } from '@/services/faqService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { FaqCreateRequest, FaqUpdateRequest } from '@/types/faqs';

export const useFaqs = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.FAQS,
    queryFn: () => faqService.list(),
    enabled,
  });

export const useCreateFaqMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FaqCreateRequest) => faqService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAQS });
      toast.success('FAQ created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateFaqMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FaqUpdateRequest }) =>
      faqService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAQS });
      toast.success('FAQ updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteFaqMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => faqService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAQS });
      toast.success('FAQ removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
