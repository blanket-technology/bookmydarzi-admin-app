import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  DeliveryBroadcastOffersResponse,
  EmployeeOnlineStatus,
} from '@/types/deliveries';

export const deliveryService = {
  list: async (): Promise<DeliveryBroadcastOffersResponse> => {
    const { data } = await apiClient.get<DeliveryBroadcastOffersResponse>(
      ENDPOINTS.EMPLOYEE.DELIVERY_BROADCASTS,
    );
    return data;
  },
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.DELIVERY_BROADCAST_ACCEPT(orderId));
    return data;
  },
  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.DELIVERY_BROADCAST_DECLINE(orderId));
    return data;
  },
  backOut: async (orderId: string, payload: { reason_code: string; reason_text?: string }) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.DELIVERY_BROADCAST_BACK_OUT(orderId), payload);
    return data;
  },
  setOnlineStatus: async (payload: {
    is_online: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<EmployeeOnlineStatus> => {
    const { data } = await apiClient.patch<EmployeeOnlineStatus>(
      ENDPOINTS.EMPLOYEE.ONLINE_STATUS,
      payload,
    );
    return data;
  },
};
