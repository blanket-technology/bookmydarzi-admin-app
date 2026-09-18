import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { reviewService } from '@/services/reviewService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { AdminReviewListParams } from '@/types/review';

export const useAdminReviews = (params?: AdminReviewListParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ADMIN_REVIEWS(params as Record<string, unknown>),
    queryFn: () => reviewService.list(params),
    enabled,
  });

export const useHideReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: number; reason?: string }) =>
      reviewService.hide(reviewId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review hidden');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUnhideReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewService.unhide(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review unhidden');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewService.remove(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
