import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminTailorListItem,
  AdminTailorsResponse,
  EmployeeTailorListItem,
  TailorSelfProfile,
  TailorSelfProfileUpdateRequest,
  TailorWorkloadItem,
  UpdateTailorRequest,
} from '@/types/tailors';
import type { PayoutListParams, PayoutListResponse, TailorPayoutSummary } from '@/types/payouts';

export interface TailorsQueryParams {
  search?: string;
}

export interface TailorsPaginatedQueryParams {
  search?: string;
  page: number;
  limit: number;
}

// Backend's AdminTailorListItem schema declares tailor_id/user_id as `int`
// (app/schemas/staff.py) - the raw JSON response has them as JS numbers,
// but every screen in this app treats AdminTailorListItem.tailor_id as a
// string (route params, .toLowerCase() search filtering, etc). Without
// normalizing here, tailors/index.tsx's client-side search crashed on
// `item.tailor_id.toLowerCase()` (not a function on a number) - the actual
// cause of "search by ID not working". Normalize once at the service
// boundary, same pattern already used for customerService/staffService.
function normalizeTailor(raw: AdminTailorListItem): AdminTailorListItem {
  return { ...raw, tailor_id: String(raw.tailor_id), user_id: String(raw.user_id) };
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
    const tailors = data.map(normalizeTailor);
    return { tailors, total: tailors.length };
  },

  // GET /admin/tailors/paginated - server-side page/limit/search, unlike
  // getTailors above (which fetches the entire tailor roster every time).
  // The response is already { items, total, page, limit, has_next }.
  getTailorsPaginated: async (params: TailorsPaginatedQueryParams): Promise<AdminTailorsResponse> => {
    const { data } = await apiClient.get<{ items: AdminTailorListItem[]; total: number }>(
      ENDPOINTS.ADMIN.TAILORS_PAGINATED,
      { params },
    );
    return { items: data.items.map(normalizeTailor), total: data.total };
  },

  // Employee-safe tailor list for the assignment picker - no contact
  // details or KYC document URLs. See EmployeeTailorListItem.
  getTailorsForEmployee: async (): Promise<EmployeeTailorListItem[]> => {
    const { data } = await apiClient.get<EmployeeTailorListItem[]>(ENDPOINTS.EMPLOYEE.TAILORS);
    return data.map((t) => ({ ...t, tailor_id: String(t.tailor_id) }));
  },

  getTailorWorkload: async (): Promise<TailorWorkloadItem[]> => {
    const { data } = await apiClient.get<TailorWorkloadItem[]>(ENDPOINTS.ADMIN.TAILORS_WORKLOAD);
    return data.map((w) => ({ ...w, tailor_id: String(w.tailor_id) }));
  },

  getTailor: async (tailorId: string): Promise<AdminTailorListItem> => {
    const { data } = await apiClient.get<AdminTailorListItem>(
      ENDPOINTS.ADMIN.TAILOR_DETAIL(tailorId),
    );
    return normalizeTailor(data);
  },

  updateTailor: async (
    tailorId: string,
    payload: UpdateTailorRequest,
  ): Promise<AdminTailorListItem> => {
    const { data } = await apiClient.patch<AdminTailorListItem>(
      ENDPOINTS.ADMIN.TAILOR_DETAIL(tailorId),
      payload,
    );
    return normalizeTailor(data);
  },

  // Verification is a deliberate, standalone admin review action, kept
  // separate from updateTailor even though both PATCH the same resource —
  // mirrors BMD-Admin web's toggleVerification (TailorFullDetails.jsx),
  // which never bundles is_approved into a general profile-edit save. The
  // backend rejects false->true unless all 3 KYC docs are already uploaded.
  setTailorApproval: async (tailorId: string, isApproved: boolean): Promise<AdminTailorListItem> => {
    const { data } = await apiClient.patch<AdminTailorListItem>(
      ENDPOINTS.ADMIN.TAILOR_DETAIL(tailorId),
      { is_approved: isApproved },
    );
    return normalizeTailor(data);
  },

  deleteTailor: async (tailorId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>(
      ENDPOINTS.ADMIN.TAILOR_DETAIL(tailorId),
    );
    return data;
  },

  // Self-service — a tailor viewing/editing their own profile, distinct
  // from the admin-facing getTailor/updateTailor above (different endpoint,
  // different response shape: TailorSelfProfile is PascalCase, no
  // email/mobile/is_approved — those live on the USERS/profile record and
  // KYC review flow, not this resource).
  getMyProfile: async (): Promise<TailorSelfProfile> => {
    const { data } = await apiClient.get<TailorSelfProfile>(ENDPOINTS.TAILOR.ME);
    return data;
  },

  updateMyProfile: async (payload: TailorSelfProfileUpdateRequest): Promise<TailorSelfProfile> => {
    const { data } = await apiClient.patch<TailorSelfProfile>(ENDPOINTS.TAILOR.ME, payload);
    return data;
  },

  // Real per-order commission ledger (GET /tailors/me/payouts), scoped
  // server-side to the caller's own tailor_id - replaces the old
  // client-side derived "sum of my completed orders" approximation.
  getMyPayouts: async (params: Omit<PayoutListParams, 'tailor_id'>): Promise<PayoutListResponse> => {
    const { data } = await apiClient.get<PayoutListResponse>(ENDPOINTS.TAILOR.MY_PAYOUTS, { params });
    return data;
  },

  getMyPayoutSummary: async (): Promise<TailorPayoutSummary> => {
    const { data } = await apiClient.get<TailorPayoutSummary>(ENDPOINTS.TAILOR.MY_PAYOUT_SUMMARY);
    return data;
  },

  // Multipart upload matching the backend's Form(document_type) + File(file)
  // signature (admin.py's upload_tailor_kyc) — same FormData pattern as
  // progressPhotoService.upload. 8MB cap and jpeg/png/pdf-only are enforced
  // server-side via magic-byte sniffing; this client doesn't duplicate that
  // validation beyond the picker's own mediaTypes filter.
  uploadKyc: async (
    tailorId: string,
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
      ENDPOINTS.ADMIN.TAILOR_KYC(tailorId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
