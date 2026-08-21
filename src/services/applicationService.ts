import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ApplicationActionResponse,
  ApplicationsQueryParams,
  RejectApplicationRequest,
  TailorApplicationDetail,
  TailorApplicationsResponse,
} from '@/types/applications';

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
    options?: { overridePanRequirement?: boolean },
  ): Promise<ApplicationActionResponse> => {
    const { data } = await apiClient.patch<ApplicationActionResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_APPROVE(applicationId),
      { override_pan_requirement: options?.overridePanRequirement ?? false },
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
};
