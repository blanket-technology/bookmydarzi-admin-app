import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminStaffListItem,
  StaffCreateRequest,
  StaffCreateResponse,
  StaffListResponse,
} from '@/types/staff';

export interface StaffQueryParams {
  role?: string;
  search?: string;
}

export const staffService = {
  getStaff: async (params?: StaffQueryParams): Promise<StaffListResponse> => {
    const { data } = await apiClient.get<StaffListResponse>(ENDPOINTS.ADMIN.STAFF, { params });
    return data;
  },

  createStaff: async (payload: StaffCreateRequest): Promise<StaffCreateResponse> => {
    const { data } = await apiClient.post<StaffCreateResponse>(ENDPOINTS.ADMIN.STAFF, payload);
    return data;
  },

  getStaffMember: async (id: string): Promise<AdminStaffListItem> => {
    const response = await staffService.getStaff();
    const items = response.staff ?? response.items ?? [];
    const member = items.find((item) => item.id === id);
    if (!member) throw new Error('Staff member not found');
    return member;
  },
};
