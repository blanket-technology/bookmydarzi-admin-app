import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ApplicationActionResponse,
  ApplicationsQueryParams,
  CreateTailorApplicationRequest,
  RejectApplicationRequest,
  TailorApplicationDetail,
  TailorApplicationsResponse,
} from '@/types/applications';

type SubmitResponse = { message: string; application_id: number; status: string };

const appendFile = (
  form: FormData,
  field: string,
  file?: { uri: string; fileName?: string; mimeType?: string },
) => {
  if (!file) return;
  form.append(field, {
    uri: file.uri,
    name: file.fileName ?? `${field}-${Date.now()}.jpg`,
    type: file.mimeType ?? 'image/jpeg',
  } as unknown as Blob);
};

// Backend stores/returns Status as uppercase ("PENDING"/"APPROVED"/
// "REJECTED" — see app/models/tailor_application.py's Status column
// default), but every other status field in this app (orders, tickets,
// chat) is lowercase, and the UI's own comparisons (e.g. applications/[id]
// .tsx's isPending) were written assuming lowercase. Normalize once here so
// the mismatch can't silently break "isPending"-style checks again — it
// already had (the approve/reject buttons never rendered since === "pending"
// never matched the real "PENDING" value).
const normalizeStatus = <T extends { status: string }>(item: T): T => ({
  ...item,
  status: item.status.toLowerCase(),
});

export const applicationService = {
  getApplications: async (
    params?: ApplicationsQueryParams,
  ): Promise<TailorApplicationsResponse> => {
    const { data } = await apiClient.get<TailorApplicationsResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATIONS,
      { params },
    );
    const items = (data.applications ?? data.items ?? []).map(normalizeStatus);
    return { ...data, applications: items, items };
  },

  getApplication: async (applicationId: string): Promise<TailorApplicationDetail> => {
    const { data } = await apiClient.get<TailorApplicationDetail>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_DETAIL(applicationId),
    );
    return normalizeStatus(data);
  },

  approveApplication: async (
    applicationId: string,
    options?: { overridePanRequirement?: boolean; panWaiverReason?: string },
  ): Promise<ApplicationActionResponse> => {
    const overridePanRequirement = options?.overridePanRequirement ?? false;
    const { data } = await apiClient.patch<ApplicationActionResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_APPROVE(applicationId),
      {
        override_pan_requirement: overridePanRequirement,
        ...(overridePanRequirement ? { pan_waiver_reason: options?.panWaiverReason } : {}),
      },
    );
    return data;
  },

  rejectApplication: async (
    applicationId: string,
    payload: RejectApplicationRequest,
  ): Promise<ApplicationActionResponse> => {
    const { data } = await apiClient.patch<ApplicationActionResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_REJECT(applicationId),
      payload,
    );
    return data;
  },

  createApplication: async (payload: CreateTailorApplicationRequest): Promise<SubmitResponse> => {
    const form = new FormData();
    form.append('full_name', payload.full_name);
    form.append('email', payload.email);
    form.append('phone', payload.phone);
    if (payload.address) form.append('address', payload.address);
    if (payload.city) form.append('city', payload.city);
    if (payload.state) form.append('state', payload.state);
    if (payload.pincode) form.append('pincode', payload.pincode);
    if (payload.specialization) form.append('specialization', payload.specialization);
    if (payload.experience_years != null) {
      form.append('experience_years', String(payload.experience_years));
    }
    appendFile(form, 'aadhaar_front', payload.aadhaarFront);
    appendFile(form, 'aadhaar_back', payload.aadhaarBack);
    appendFile(form, 'pan_card', payload.panCard);

    const { data } = await apiClient.post<SubmitResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATIONS,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
