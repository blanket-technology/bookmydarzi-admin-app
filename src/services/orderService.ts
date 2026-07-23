import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminCancelOrderRequest,
  AdminOrderItem,
  AdminOrderMeasurementRequest,
  AdminOrdersResponse,
  AssignTailorRequest,
  CollectPaymentRequest,
  CollectPaymentResponse,
  EmployeeOrderActionResponse,
  MyOrderItem,
  MyOrdersResponse,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
  RejectOrderRequest,
  SchedulePickupRequest,
} from '@/types/orders';

// Both GET /admin/orders and GET /orders/my-orders serialize the same
// backend OrderResponse shape (PascalCase Id/CustomerId/TailorId/... — see
// app/services/orders/order_response_builder.py build_order_response, used
// by both endpoints). Neither endpoint denormalizes a customer/tailor display
// name onto the row; the closest available fields are the nested `address`
// (customer's full_name/mobile) and TailorSpecialization. Normalize once here
// so every screen using AdminOrderItem gets real, non-undefined keys/fields
// regardless of which endpoint served the row.
function normalizeOrderResponse(item: MyOrderItem): AdminOrderItem {
  return {
    order_id: String(item.Id),
    order_code: item.OrderCode ?? item.OrderNumber ?? undefined,
    customer_id: String(item.CustomerId),
    customer_name: item.address?.full_name ?? undefined,
    customer_mobile: item.address?.mobile ?? undefined,
    service_name: item.ServiceTitle ?? item.ServiceName ?? undefined,
    category_name: item.ServiceSubtitle ?? undefined,
    status: item.Status,
    payment_status: item.PaymentStatus ?? undefined,
    final_amount: item.FinalAmount,
    booking_amount: item.BookingAmount,
    remaining_amount: item.RemainingAmount,
    tailor_id: item.TailorId != null ? String(item.TailorId) : undefined,
    tailor_name: item.TailorId != null ? (item.TailorSpecialization ?? `Tailor #${item.TailorId}`) : undefined,
    urgency_level: item.UrgencyLevel ?? undefined,
    pickup_type: item.PickupType ?? undefined,
    scheduled_pickup_at: item.ScheduledPickupAt ?? undefined,
    created_at: item.CreatedAt,
    expected_delivery_date: item.ExpectedDeliveryDate ?? undefined,
  };
}

export const orderService = {
  getOrders: async (params?: OrdersQueryParams): Promise<AdminOrdersResponse> => {
    const { data } = await apiClient.get<MyOrdersResponse>(ENDPOINTS.ADMIN.ORDERS, { params });
    return {
      orders: data.orders.map(normalizeOrderResponse),
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  },

  // Tailor-scoped order list — backend excludes TAILOR from GET /admin/orders,
  // so this hits GET /orders/my-orders instead (also used by customers, but
  // this app only calls it for the tailor role).
  getMyOrders: async (params?: OrdersQueryParams): Promise<AdminOrdersResponse> => {
    const { data } = await apiClient.get<MyOrdersResponse>(ENDPOINTS.ORDERS.MY_ORDERS, {
      params: { page: params?.page, limit: params?.limit, status: params?.status },
    });
    return {
      orders: data.orders.map(normalizeOrderResponse),
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
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

  // Admin-only "correct a stuck order" escape hatch — restricted client-side
  // to ADMIN_CORRECTABLE_STATUS_OPTIONS (see constants/orderStatus.ts).
  updateStatus: async (orderId: string, payload: OrderStatusUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.ORDER_STATUS(orderId), payload);
    return data;
  },

  // Tailor-only: restricted server-side to TAILOR_ALLOWED_TARGETS with strict
  // sequential progression (see order_status_rules.assert_role_may_transition).
  updateStitchingStatus: async (orderId: string, payload: OrderStatusUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ORDERS.UPDATE_STATUS(orderId), payload);
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

  acceptOrder: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_ACCEPT(orderId));
    return data;
  },

  rejectOrder: async (
    orderId: string,
    payload?: RejectOrderRequest,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_REJECT(orderId), payload);
    return data;
  },

  schedulePickup: async (
    orderId: string,
    payload?: SchedulePickupRequest,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(
      ENDPOINTS.EMPLOYEE.ORDER_SCHEDULE_PICKUP(orderId),
      payload,
    );
    return data;
  },

  confirmPickup: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_CONFIRM_PICKUP(orderId));
    return data;
  },

  handToTailor: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_HAND_TO_TAILOR(orderId));
    return data;
  },

  markOutForDelivery: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_DELIVERY(orderId));
    return data;
  },

  completeOrder: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_COMPLETE(orderId));
    return data;
  },

  collectPayment: async (
    orderId: string,
    payload: CollectPaymentRequest,
  ): Promise<CollectPaymentResponse> => {
    const { data } = await apiClient.post(
      ENDPOINTS.EMPLOYEE.ORDER_COLLECT_PAYMENT(orderId),
      payload,
    );
    return data;
  },
};
