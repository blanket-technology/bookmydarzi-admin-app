import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { RepairPickupBroadcastOffersResponse } from '@/types/repairPickups';

export const repairPickupService = {
  list: async (): Promise<RepairPickupBroadcastOffersResponse> => {
    const { data } = await apiClient.get<RepairPickupBroadcastOffersResponse>(
      ENDPOINTS.EMPLOYEE.REPAIR_PICKUP_BROADCASTS,
    );
    return data;
  },
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_PICKUP_BROADCAST_ACCEPT(orderId));
    return data;
  },
  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_PICKUP_BROADCAST_DECLINE(orderId));
    return data;
  },
  markInTransit: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_PICKUP_IN_TRANSIT(orderId));
    return data;
  },
  markDeliveredToTailor: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.REPAIR_PICKUP_DELIVERED_TO_TAILOR(orderId));
    return data;
  },
};
