import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { RepairDeliveryBroadcastOffersResponse } from '@/types/repairDeliveries';

export const repairDeliveryService = {
  list: async (): Promise<RepairDeliveryBroadcastOffersResponse> => {
    const { data } = await apiClient.get<RepairDeliveryBroadcastOffersResponse>(
      ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_BROADCASTS,
    );
    return data;
  },
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_BROADCAST_ACCEPT(orderId));
    return data;
  },
  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_BROADCAST_DECLINE(orderId));
    return data;
  },
  backOut: async (orderId: string, payload: { reason_code: string; reason_text?: string }) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_BROADCAST_BACK_OUT(orderId),
      payload,
    );
    return data;
  },
  markInTransit: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_IN_TRANSIT(orderId));
    return data;
  },
  markComplete: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_DELIVERY_COMPLETE(orderId));
    return data;
  },
};
