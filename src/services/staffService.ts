import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminStaffDetail,
  AdminStaffListItem,
  BridgeProfileUpdateRequest,
  StaffCreateRequest,
  StaffCreateResponse,
  StaffListResponse,
  StaffPaginatedResponse,
  StaffUpdateRequest,
} from '@/types/staff';

export interface StaffQueryParams {
  role?: string;
  search?: string;
}

export interface StaffPaginatedQueryParams {
  role?: string;
  search?: string;
  page: number;
  limit: number;
}

// Backend's AdminStaffListItem/AdminStaffDetail schemas declare id/tailor_id
// as `int` (app/schemas/staff.py) - raw JSON has them as JS numbers, but
// this app treats both as strings everywhere (route params, list keys).
// Same class of bug as tailorService's tailor_id (see its comment) -
// normalize once at the service boundary rather than relying on every
// call site to remember to String()-wrap it.
function normalizeStaffListItem<T extends { id: number | string; tailor_id?: number | string | null }>(
  raw: T,
): T {
  return { ...raw, id: String(raw.id), tailor_id: raw.tailor_id != null ? String(raw.tailor_id) : undefined };
}

export const staffService = {
  getStaff: async (params?: StaffQueryParams): Promise<StaffListResponse> => {
    const { data } = await apiClient.get<StaffListResponse>(ENDPOINTS.ADMIN.STAFF, { params });
    return data.map(normalizeStaffListItem);
  },

  // GET /admin/staff/paginated - server-side page/limit/search, unlike
  // getStaff above (which fetches the entire staff roster every time and
  // silently ignores `search`, since the old endpoint never supported it).
  getStaffPaginated: async (params: StaffPaginatedQueryParams): Promise<StaffPaginatedResponse> => {
    const { data } = await apiClient.get<StaffPaginatedResponse>(ENDPOINTS.ADMIN.STAFF_PAGINATED, {
      params,
    });
    return { ...data, items: data.items.map(normalizeStaffListItem) };
  },

  createStaff: async (payload: StaffCreateRequest): Promise<StaffCreateResponse> => {
    const { data } = await apiClient.post<StaffCreateResponse>(ENDPOINTS.ADMIN.STAFF, payload);
    return data;
  },

  // Real detail fetch — GET /admin/staff/{id}, distinct from the plain list
  // item (adds assigned_orders_count/assigned_orders and, for role ===
  // "employee", the bridge_* sections). Previously this filtered the full
  // staff list client-side for a matching id, which both wasted a request
  // and could never return anything beyond the list's thin shape.
  getStaffMember: async (id: string): Promise<AdminStaffDetail> => {
    const { data } = await apiClient.get<AdminStaffDetail>(ENDPOINTS.ADMIN.STAFF_DETAIL(id));
    return normalizeStaffListItem(data);
  },

  updateStaff: async (id: string, payload: StaffUpdateRequest): Promise<AdminStaffListItem> => {
    const { data } = await apiClient.patch<AdminStaffListItem>(
      ENDPOINTS.ADMIN.STAFF_DETAIL(id),
      payload,
    );
    return normalizeStaffListItem(data);
  },

  updateBridgeProfile: async (
    id: string,
    payload: BridgeProfileUpdateRequest,
  ): Promise<AdminStaffDetail> => {
    const { data } = await apiClient.patch<AdminStaffDetail>(
      ENDPOINTS.ADMIN.STAFF_BRIDGE_PROFILE(id),
      payload,
    );
    return normalizeStaffListItem(data);
  },

  // Kept separate from updateBridgeProfile - a deliberate review action,
  // same pattern as tailor verification (setTailorApproval). Backend
  // rejects is_approved=true unless all 3 KYC docs are already uploaded.
  setBridgeVerification: async (id: string, isApproved: boolean): Promise<AdminStaffDetail> => {
    const { data } = await apiClient.patch<AdminStaffDetail>(
      ENDPOINTS.ADMIN.STAFF_VERIFICATION(id),
      { is_approved: isApproved },
    );
    return normalizeStaffListItem(data);
  },

  uploadKyc: async (
    staffId: string,
    payload: { uri: string; fileName?: string; mimeType?: string; documentType: 'aadhar' | 'pan_card' | 'other' },
  ): Promise<{ document_type: string; url: string }> => {
    const form = new FormData();
    form.append('document_type', payload.documentType);
    form.append('file', {
      uri: payload.uri,
      name: payload.fileName ?? `${payload.documentType}-${Date.now()}.jpg`,
      type: payload.mimeType ?? 'image/jpeg',
    } as unknown as Blob);

    const { data } = await apiClient.post<{ document_type: string; url: string }>(
      ENDPOINTS.ADMIN.STAFF_KYC(staffId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
