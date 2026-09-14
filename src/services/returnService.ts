import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { ReturnBroadcastOffersResponse } from '@/types/returns';

export const returnService = {
  list: async (): Promise<ReturnBroadcastOffersResponse> => {
    const { data } = await apiClient.get<ReturnBroadcastOffersResponse>(
      ENDPOINTS.EMPLOYEE.RETURN_BROADCASTS,
    );
    return data;
  },
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.RETURN_BROADCAST_ACCEPT(orderId));
    return data;
  },
  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.RETURN_BROADCAST_DECLINE(orderId));
    return data;
  },
  markInTransit: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.RETURN_IN_TRANSIT(orderId));
    return data;
  },
  markComplete: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.RETURN_COMPLETE(orderId));
    return data;
  },
};
