import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { AdminUserItem, AdminUsersResponse, UserStatusUpdateRequest } from '@/types/users';

export interface CustomersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const customerService = {
  getCustomers: async (params?: CustomersQueryParams): Promise<AdminUsersResponse> => {
    const { data } = await apiClient.get<AdminUsersResponse>(ENDPOINTS.ADMIN.USERS, { params });
    return data;
  },

  getCustomer: async (userId: string): Promise<AdminUserItem> => {
    const { data } = await apiClient.get<AdminUserItem>(ENDPOINTS.ADMIN.USER_DETAIL(userId));
    return data;
  },

  updateStatus: async (userId: string, payload: UserStatusUpdateRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.USER_STATUS(userId),
      payload,
    );
    return data;
  },
};
