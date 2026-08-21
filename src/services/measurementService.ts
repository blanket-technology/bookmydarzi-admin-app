import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  MeasurementCreateRequest,
  MeasurementListResponse,
  MeasurementProfile,
  MeasurementUpdateRequest,
} from '@/types/measurements';

export const measurementService = {
  // GET /users/measurements — staff (admin/superadmin/employee) may pass
  // user_id to look up one customer's saved profiles instead of the whole
  // system-wide table (app/api/v1/endpoints/measurements.py list_measurements).
  list: async (userId?: string): Promise<MeasurementListResponse> => {
    const { data } = await apiClient.get<MeasurementListResponse>(ENDPOINTS.MEASUREMENTS.LIST, {
      params: userId ? { user_id: userId } : undefined,
    });
    return data;
  },

  create: async (payload: MeasurementCreateRequest): Promise<MeasurementProfile> => {
    const { data } = await apiClient.post<MeasurementProfile>(
      ENDPOINTS.MEASUREMENTS.LIST,
      payload,
    );
    return data;
  },

  update: async (
    id: string,
    payload: MeasurementUpdateRequest,
  ): Promise<MeasurementProfile> => {
    const { data } = await apiClient.patch<MeasurementProfile>(
      ENDPOINTS.MEASUREMENTS.DETAIL(id),
      payload,
    );
    return data;
  },
};
