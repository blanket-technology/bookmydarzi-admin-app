import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ServiceArea,
  ServiceAreaCreateRequest,
  ServiceAreaInterestsResponse,
  ServiceAreaUpdateRequest,
} from '@/types/serviceAreas';

export const serviceAreasService = {
  list: async (): Promise<ServiceArea[]> => {
    const { data } = await apiClient.get<ServiceArea[]>(ENDPOINTS.LOCATION.ADMIN_SERVICE_AREAS);
    return data;
  },

  create: async (payload: ServiceAreaCreateRequest): Promise<ServiceArea> => {
    const { data } = await apiClient.post<ServiceArea>(ENDPOINTS.LOCATION.ADMIN_SERVICE_AREAS, payload);
    return data;
  },

  update: async (id: number, payload: ServiceAreaUpdateRequest): Promise<ServiceArea> => {
    const { data } = await apiClient.patch<ServiceArea>(
      ENDPOINTS.LOCATION.ADMIN_SERVICE_AREA_DETAIL(String(id)),
      payload,
    );
    return data;
  },

  delete: async (id: number) => {
    const { data } = await apiClient.delete(ENDPOINTS.LOCATION.ADMIN_SERVICE_AREA_DETAIL(String(id)));
    return data;
  },

  // Read-only lead list - mirrors final's useServiceAreaInterests.js.
  listInterests: async (params: { skip: number; limit: number }): Promise<ServiceAreaInterestsResponse> => {
    const { data } = await apiClient.get<ServiceAreaInterestsResponse>(
      ENDPOINTS.LOCATION.ADMIN_SERVICE_AREA_INTERESTS,
      { params },
    );
    return data;
  },
};
