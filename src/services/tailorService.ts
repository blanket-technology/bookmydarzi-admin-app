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
  // GET /admin/tailors returns a bare List[AdminTailorListItem] (no
  // pagination wrapper — see app/api/v1/endpoints/admin.py list_tailors_admin,
  // response_model=List[AdminTailorListItem]), not an { tailors, total }
  // envelope. Wrap it here so every consumer of AdminTailorsResponse
  // (useTailors, tailors/index.tsx, the Assign Tailor sheet) sees one shape.
  getTailors: async (params?: TailorsQueryParams): Promise<AdminTailorsResponse> => {
    const { data } = await apiClient.get<AdminTailorListItem[]>(ENDPOINTS.ADMIN.TAILORS, {
      params,
    });
    return { tailors: data, total: data.length };
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
