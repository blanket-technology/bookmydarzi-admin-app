import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminCancelOrderRequest,
  AdminOrderMeasurementRequest,
  AdminOrdersResponse,
  AssignTailorRequest,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
} from '@/types/orders';

export const orderService = {
  getOrders: async (params?: OrdersQueryParams): Promise<AdminOrdersResponse> => {
    const { data } = await apiClient.get<AdminOrdersResponse>(ENDPOINTS.ADMIN.ORDERS, { params });
    return data;
  },

  assignTailor: async (orderId: string, payload: AssignTailorRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_TAILOR(orderId),
      payload,
    );
    return data;
  },

  updateMeasurement: async (orderId: string, payload: AdminOrderMeasurementRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_MEASUREMENT(orderId),
      payload,
    );
    return data;
  },

  updateStatus: async (orderId: string, payload: OrderStatusUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.ORDER_STATUS(orderId), payload);
    return data;
  },

  cancelOrder: async (orderId: string, payload: AdminCancelOrderRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.ORDER_CANCEL(orderId), payload);
    return data;
  },

  updateNotes: async (orderId: string, payload: OrderNotesRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.ORDER_NOTES(orderId), payload);
    return data;
  },
};
