import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { PickupBroadcastOffersResponse } from '@/types/pickups';
import type { EmployeeOnlineStatus } from '@/types/deliveries';

// Pickup-leg FCFS offers (Rapido-style). Shares the same employee online-status
// endpoint as delivery — an employee's online/location state is one thing,
// used to match both pickup and delivery broadcasts.
export const pickupService = {
  list: async (): Promise<PickupBroadcastOffersResponse> => {
    const { data } = await apiClient.get<PickupBroadcastOffersResponse>(
      ENDPOINTS.EMPLOYEE.PICKUP_BROADCASTS,
    );
    return data;
  },
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.PICKUP_BROADCAST_ACCEPT(orderId));
    return data;
  },
  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.PICKUP_BROADCAST_DECLINE(orderId));
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
  getOnlineStatus: async (): Promise<EmployeeOnlineStatus> => {
    const { data } = await apiClient.get<EmployeeOnlineStatus>(ENDPOINTS.EMPLOYEE.ONLINE_STATUS);
    return data;
  },
};
