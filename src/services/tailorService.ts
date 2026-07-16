import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminTailorListItem,
  AdminTailorsResponse,
  TailorWorkloadItem,
} from '@/types/tailors';

export interface TailorsQueryParams {
  search?: string;
}

export const tailorService = {
  getTailors: async (params?: TailorsQueryParams): Promise<AdminTailorsResponse> => {
    const { data } = await apiClient.get<AdminTailorsResponse>(ENDPOINTS.ADMIN.TAILORS, {
      params,
    });
    return data;
  },

  getTailorWorkload: async (): Promise<TailorWorkloadItem[]> => {
    const { data } = await apiClient.get<TailorWorkloadItem[]>(ENDPOINTS.ADMIN.TAILORS_WORKLOAD);
    return data;
  },

  getTailor: async (tailorId: string): Promise<AdminTailorListItem> => {
    const response = await tailorService.getTailors();
    const items = response.tailors ?? response.items ?? [];
    const tailor = items.find((item) => item.tailor_id === tailorId);
    if (!tailor) throw new Error('Tailor not found');
    return tailor;
  },
};
