import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  CancellationApproveRequest,
  CancellationListResponse,
  CancellationPatchRequest,
  CancellationPolicyItem,
  CancellationPolicyUpdate,
  CancellationRejectRequest,
  CancellationsQueryParams,
  OrderCancellationDetail,
} from '@/types/cancellations';

export const cancellationService = {
  list: async (params?: CancellationsQueryParams): Promise<CancellationListResponse> => {
    const { data } = await apiClient.get<CancellationListResponse>(ENDPOINTS.ADMIN.CANCELLATIONS, {
      params,
    });
    return data;
  },

  getById: async (id: string): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.get<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_DETAIL(id),
    );
    return data;
  },

  approve: async (
    id: string,
    payload: CancellationApproveRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.post<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_APPROVE(id),
      payload,
    );
    return data;
  },

  reject: async (
    id: string,
    payload: CancellationRejectRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.post<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_REJECT(id),
      payload,
    );
    return data;
  },

  patch: async (
    id: string,
    payload: CancellationPatchRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.patch<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_DETAIL(id),
      payload,
    );
    return data;
  },

  getPolicy: async (): Promise<CancellationPolicyItem[]> => {
    const { data } = await apiClient.get<CancellationPolicyItem[]>(
      ENDPOINTS.ADMIN.CANCELLATION_POLICY,
    );
    return data;
  },

  updatePolicyStage: async (
    stage: string,
    payload: CancellationPolicyUpdate,
  ): Promise<CancellationPolicyItem> => {
    const { data } = await apiClient.put<CancellationPolicyItem>(
      ENDPOINTS.ADMIN.CANCELLATION_POLICY_STAGE(stage),
      payload,
    );
    return data;
  },
};
