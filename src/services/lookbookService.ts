import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  LookbookAdminItem,
  LookbookCreateRequest,
  LookbookUpdateRequest,
} from '@/types/lookbook';

export const lookbookService = {
  listAdmin: async (): Promise<LookbookAdminItem[]> => {
    const { data } = await apiClient.get<LookbookAdminItem[]>(ENDPOINTS.LOOKBOOK.ADMIN_LIST);
    return data;
  },

  create: async (payload: LookbookCreateRequest): Promise<{ message: string; id: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.LOOKBOOK.ADMIN_LIST, payload);
    return data;
  },

  update: async (id: string, payload: LookbookUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.LOOKBOOK.ADMIN_DETAIL(id), payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.LOOKBOOK.ADMIN_DETAIL(id));
    return data;
  },
};
