import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { FaqCreateRequest, FaqItem, FaqListResponse, FaqUpdateRequest } from '@/types/faqs';

export const faqService = {
  list: async (): Promise<FaqItem[]> => {
    // GET /support/faqs (support_repository.list_faqs) filters IsActive=True
    // server-side for every caller - there is no admin-scoped "list all
    // including inactive" endpoint. Admin_Web has the exact same limitation
    // (final/src/features/support/services calls this same route), so a
    // FAQ that gets deactivated here becomes invisible to admin management
    // until reactivated directly via PATCH with a remembered id. Matches
    // existing web behavior, not a mobile-specific gap.
    const { data } = await apiClient.get<FaqListResponse>(ENDPOINTS.SUPPORT.FAQS);
    return data.faqs;
  },

  create: async (payload: FaqCreateRequest): Promise<FaqItem> => {
    const { data } = await apiClient.post<FaqItem>(ENDPOINTS.SUPPORT.FAQS, payload);
    return data;
  },

  update: async (id: number, payload: FaqUpdateRequest): Promise<FaqItem> => {
    const { data } = await apiClient.patch<FaqItem>(ENDPOINTS.SUPPORT.FAQ_DETAIL(String(id)), payload);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await apiClient.delete(ENDPOINTS.SUPPORT.FAQ_DETAIL(String(id)));
    return data;
  },
};
