import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ApplicationActionResponse,
  ApplicationsQueryParams,
  RejectApplicationRequest,
  TailorApplicationDetail,
  TailorApplicationsResponse,
} from '@/types/applications';

export const applicationService = {
  getApplications: async (
    params?: ApplicationsQueryParams,
  ): Promise<TailorApplicationsResponse> => {
    const { data } = await apiClient.get<TailorApplicationsResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATIONS,
      { params },
    );
    return data;
  },

  getApplication: async (applicationId: string): Promise<TailorApplicationDetail> => {
    const { data } = await apiClient.get<TailorApplicationDetail>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_DETAIL(applicationId),
    );
    return data;
  },

  approveApplication: async (applicationId: string): Promise<ApplicationActionResponse> => {
    const { data } = await apiClient.patch<ApplicationActionResponse>(
      ENDPOINTS.ADMIN.TAILOR_APPLICATION_APPROVE(applicationId),
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
