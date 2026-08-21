import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { CreateLeaveRequestPayload, LeaveRequest } from '@/types/leave';

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
};
