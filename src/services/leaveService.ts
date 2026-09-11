import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ApproveLeaveRequestPayload,
  CreateLeaveRequestPayload,
  LeaveRequest,
  LeaveRequestListParams,
  LeaveRequestListResponse,
  RejectLeaveRequestPayload,
} from '@/types/leave';

export const leaveService = {
  listMine: async (): Promise<LeaveRequest[]> => {
    const { data } = await apiClient.get<LeaveRequest[]>(ENDPOINTS.LEAVE.LIST_MY);
    return data;
  },

  create: async (payload: CreateLeaveRequestPayload): Promise<LeaveRequest> => {
    const { data } = await apiClient.post<LeaveRequest>(ENDPOINTS.LEAVE.CREATE, payload);
    return data;
  },

  cancel: async (requestId: string): Promise<LeaveRequest> => {
    const { data } = await apiClient.patch<LeaveRequest>(ENDPOINTS.LEAVE.CANCEL(requestId));
    return data;
  },

  adminList: async (params?: LeaveRequestListParams): Promise<LeaveRequestListResponse> => {
    const { data } = await apiClient.get<LeaveRequestListResponse>(ENDPOINTS.LEAVE.ADMIN_LIST, {
      params,
    });
    return data;
  },

  adminApprove: async (
    requestId: string,
    payload?: ApproveLeaveRequestPayload,
  ): Promise<LeaveRequest> => {
    const { data } = await apiClient.patch<LeaveRequest>(
      ENDPOINTS.LEAVE.ADMIN_APPROVE(requestId),
      payload ?? {},
    );
    return data;
  },

  adminReject: async (
    requestId: string,
    payload: RejectLeaveRequestPayload,
  ): Promise<LeaveRequest> => {
    const { data } = await apiClient.patch<LeaveRequest>(
      ENDPOINTS.LEAVE.ADMIN_REJECT(requestId),
      payload,
    );
    return data;
  },
};
