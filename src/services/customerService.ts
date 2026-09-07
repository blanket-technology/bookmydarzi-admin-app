import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminUserItem,
  AdminUsersResponse,
  CustomerFullDetail,
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
    user_code: raw.UserCode ?? undefined,
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
    last_login: raw.LastLogin ?? undefined,
    profile_image_url: raw.ProfileImageUrl ?? undefined,
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

  // Aggregates addresses/measurements/payments/carts/support tickets/chat
  // sessions/cancellations/penalties/wishlist in one call — see
  // admin.py's get_customer_full_detail docstring: "renders this in one
  // call rather than 8 separate round trips." Already snake_case, no
  // normalization needed (backend builds this response as plain dicts, not
  // through a PascalCase Pydantic schema like the rest of /admin/users).
  getFullDetail: async (userId: string): Promise<CustomerFullDetail> => {
    const { data } = await apiClient.get<CustomerFullDetail>(
      ENDPOINTS.ADMIN.CUSTOMER_FULL_DETAIL(userId),
    );
    return data;
  },

  deleteCustomer: async (userId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>(
      ENDPOINTS.ADMIN.USER_DETAIL(userId),
    );
    return data;
  },
};

// POST /admin/users/{id}/photo — admin uploading a photo on behalf of any
// user (tailor, Bridge/employee, customer). Not role-specific: it operates
// on the USERS table directly, same as activate/deactivate, so this is
// shared rather than duplicated per role (tailorService/staffService both
// call this instead of having their own copy).
export const userPhotoService = {
  upload: async (
    userId: string,
    payload: { uri: string; fileName?: string; mimeType?: string },
  ): Promise<{ profile_image_url?: string | null }> => {
    const form = new FormData();
    form.append('file', {
      uri: payload.uri,
      name: payload.fileName ?? `photo-${Date.now()}.jpg`,
      type: payload.mimeType ?? 'image/jpeg',
    } as unknown as Blob);

    const { data } = await apiClient.post<{ profile_image_url?: string | null }>(
      ENDPOINTS.ADMIN.USER_PHOTO(userId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
