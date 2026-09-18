import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { AdminReview, AdminReviewListParams, AdminReviewListResponse } from '@/types/review';

export const reviewService = {
  list: async (params?: AdminReviewListParams): Promise<AdminReviewListResponse> => {
    const { data } = await apiClient.get<AdminReviewListResponse>(ENDPOINTS.REVIEWS.LIST, { params });
    return data;
  },

  hide: async (reviewId: number, reason?: string): Promise<AdminReview> => {
    const { data } = await apiClient.patch<AdminReview>(ENDPOINTS.REVIEWS.HIDE(reviewId), {
      reason: reason || undefined,
    });
    return data;
  },

  unhide: async (reviewId: number): Promise<AdminReview> => {
    const { data } = await apiClient.patch<AdminReview>(ENDPOINTS.REVIEWS.UNHIDE(reviewId));
    return data;
  },

  remove: async (reviewId: number): Promise<void> => {
    await apiClient.delete(ENDPOINTS.REVIEWS.DELETE(reviewId));
  },
};
