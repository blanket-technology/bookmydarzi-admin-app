import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminUserItem,
  AdminUsersResponse,
  RawAdminUser,
  RawAdminUsersResponse,
  UserStatusUpdateRequest,
} from '@/types/users';

export interface CustomersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

// GET /admin/users and GET /admin/users/{id} both return the backend's raw
// PascalCase user shape (build_admin_user_list_item / UserResponse) — see
// app/services/users/profile_service.py — not the snake_case AdminUserItem
// this app renders. Normalize once here.
function normalizeAdminUser(raw: RawAdminUser): AdminUserItem {
  return {
    id: String(raw.Id),
    full_name: raw.FullName ?? undefined,
    first_name: raw.FirstName ?? undefined,
    last_name: raw.LastName ?? undefined,
    email: raw.Email ?? undefined,
    mobile: raw.Mobile ?? undefined,
    role: raw.Role,
    is_active: raw.IsActive,
    is_email_verified: raw.IsEmailVerified,
    is_mobile_verified: raw.IsMobileVerified,
    created_at: raw.CreatedAt ?? undefined,
  };
}

export const customerService = {
  getCustomers: async (params?: CustomersQueryParams): Promise<AdminUsersResponse> => {
    const { data } = await apiClient.get<RawAdminUsersResponse>(ENDPOINTS.ADMIN.USERS, { params });
    return {
      users: data.users.map(normalizeAdminUser),
      total: data.total,
    };
  },

  getCustomer: async (userId: string): Promise<AdminUserItem> => {
    const { data } = await apiClient.get<RawAdminUser>(ENDPOINTS.ADMIN.USER_DETAIL(userId));
    return normalizeAdminUser(data);
  },

  updateStatus: async (userId: string, payload: UserStatusUpdateRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.USER_STATUS(userId),
      payload,
    );
    return data;
  },
};
