import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminCancelOrderRequest,
  AdminOrderItem,
  AdminOrderMeasurementRequest,
  AdminOrdersResponse,
  AssignBridgeEmployeeRequest,
  AssignTailorRequest,
  BridgeEmployeeListItem,
  CollectPaymentRequest,
  CollectPaymentResponse,
  DeliveryPaymentStatus,
  EmployeeAddOrderAddonRequest,
  EmployeeOrderActionResponse,
  MyOrderItem,
  MyOrdersResponse,
  OrderBroadcastStatus,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
  RejectOrderRequest,
  SchedulePickupRequest,
} from '@/types/orders';
import type { EmployeeOrderMeasurementRequest } from '@/types/measurements';

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
    address: item.address ?? null,
    service_name: item.ServiceTitle ?? item.ServiceName ?? undefined,
    category_name: item.ServiceSubtitle ?? undefined,
    category_name_raw: item.CategoryName ?? null,
    alteration_group: item.AlterationGroup ?? null,
    status: item.Status,
    payment_status: item.PaymentStatus ?? undefined,
    final_amount: item.FinalAmount,
    booking_amount: item.BookingAmount,
    remaining_amount: item.RemainingAmount,
    tailor_id: item.TailorId != null ? String(item.TailorId) : undefined,
    // TailorName is only ever populated by the backend for staff-facing
    // responses (build_order_response's include_tailor_name flag) — never
    // sent to customers or to a tailor viewing their own order, by design.
    tailor_name:
      item.TailorId != null
        ? (item.TailorName ?? item.TailorSpecialization ?? `Tailor #${item.TailorId}`)
        : undefined,
    // Same staff-only visibility rule as tailor_name above - lets a Bridge
    // partner get directions to the tailor after pickup (hand-off) without
    // this ever reaching a customer-facing response.
    tailor_location: item.TailorLocation ?? null,
    tailor_latitude: item.TailorLatitude ?? null,
    tailor_longitude: item.TailorLongitude ?? null,
    urgency_level: item.UrgencyLevel ?? undefined,
    pickup_type: item.PickupType ?? undefined,
    scheduled_pickup_at: item.ScheduledPickupAt ?? undefined,
    created_at: item.CreatedAt,
    // Prefer the backend's IST calendar date: the raw timestamp shifts a day with the device timezone.
    expected_delivery_date: item.ExpectedDeliveryDateIso ?? item.ExpectedDeliveryDate ?? undefined,
    description: item.Description ?? null,
    fabric_notes: item.FabricNotes ?? null,
    customization_notes: item.CustomizationNotes ?? null,
    cloth_details: item.ClothDetails ?? null,
    reference_photo_url: item.ReferencePhotoUrl ?? null,
    // The cart checkout screen's separate multi-image style-reference
    // picker (distinct from reference_photo_url above, which is a single
    // per-item customization photo) - previously wasn't surfaced anywhere
    // in this app even though the backend has carried it for a while.
    image_references: item.ImageReferences ?? null,
    voice_note_url: item.VoiceNoteUrl ?? null,
    latest_repair_request: item.LatestRepairRequest ?? null,
    assigned_employee_id: item.AssignedEmployeeId != null ? String(item.AssignedEmployeeId) : undefined,
    assigned_employee_name: item.AssignedEmployeeName ?? null,
    delivery_employee_id: item.DeliveryEmployeeId != null ? String(item.DeliveryEmployeeId) : undefined,
    delivery_employee_name: item.DeliveryEmployeeName ?? null,
    return_employee_id: item.ReturnEmployeeId != null ? String(item.ReturnEmployeeId) : undefined,
    return_employee_name: item.ReturnEmployeeName ?? null,
    repair_pickup_employee_id: item.RepairPickupEmployeeId != null ? String(item.RepairPickupEmployeeId) : undefined,
    repair_pickup_employee_name: item.RepairPickupEmployeeName ?? null,
    repair_delivery_employee_id: item.RepairDeliveryEmployeeId != null ? String(item.RepairDeliveryEmployeeId) : undefined,
    repair_delivery_employee_name: item.RepairDeliveryEmployeeName ?? null,
    measurement: item.measurement ? { ...item.measurement, id: String(item.measurement.id) } : null,
    needs_manual_assignment: item.NeedsManualAssignment ?? false,
    broadcast_exhausted_at: item.BroadcastExhaustedAt ?? null,
    items: (item.Items ?? []).map((raw) => ({
      order_item_id: raw.order_item_id ?? null,
      service_id: raw.service_id ?? null,
      service_name: raw.service_name ?? null,
      category_name: raw.category_name ?? null,
      image_url: raw.image_url ?? null,
      quantity: raw.quantity ?? 1,
      price: raw.price ?? null,
      person_name: raw.person_name ?? null,
      gender: raw.gender ?? null,
      has_measurement: raw.has_measurement ?? false,
      is_cancelled: raw.is_cancelled ?? false,
      notes: raw.notes ?? null,
      reference_photo_url: raw.reference_photo_url ?? null,
    })),
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

  // Single-order fetch by id/order-code. Owner, assigned tailor, employee, or
  // admin only (backend's assert_can_view_order) — safe for every role this
  // app runs as. Replaces the previous approach of re-fetching a capped
  // 50-row list and doing a client-side .find(), which silently showed
  // "not found" for any order outside that window.
  getOrderById: async (orderId: string): Promise<AdminOrderItem> => {
    const { data } = await apiClient.get<MyOrderItem>(ENDPOINTS.ORDERS.DETAIL(orderId));
    return normalizeOrderResponse(data);
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

  // Manual (non-broadcast) Bridge/employee assignment for the pickup and
  // delivery legs - the admin-panel lever for when no Bridge employee
  // accepts the automatic broadcast. Mirrors assignTailor's shape; see
  // app/services/orders/assign_bridge_service.py on the backend.
  assignPickupEmployee: async (orderId: string, payload: AssignBridgeEmployeeRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_PICKUP_EMPLOYEE(orderId),
      payload,
    );
    return data;
  },

  assignDeliveryEmployee: async (orderId: string, payload: AssignBridgeEmployeeRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_DELIVERY_EMPLOYEE(orderId),
      payload,
    );
    return data;
  },

  // Same manual-override lever as pickup/delivery above, for the return leg
  // (post-cancellation reverse trip) - see assign_bridge_service.py's
  // assign_return_employee on the backend.
  assignReturnEmployee: async (orderId: string, payload: AssignBridgeEmployeeRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_RETURN_EMPLOYEE(orderId),
      payload,
    );
    return data;
  },

  // Same manual-override lever as above, for the two repair legs
  // (customer<->tailor round trip for a reported post-delivery issue) -
  // see assign_bridge_service.py's assign_repair_pickup_employee /
  // assign_repair_delivery_employee on the backend. Previously neither
  // repair leg had any admin-assignment lever at all.
  assignRepairPickupEmployee: async (orderId: string, payload: AssignBridgeEmployeeRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_REPAIR_PICKUP_EMPLOYEE(orderId),
      payload,
    );
    return data;
  },

  assignRepairDeliveryEmployee: async (orderId: string, payload: AssignBridgeEmployeeRequest) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.ORDER_ASSIGN_REPAIR_DELIVERY_EMPLOYEE(orderId),
      payload,
    );
    return data;
  },

  // Bridge/employee picker for the assignment actions above - open to
  // admin/superadmin/employee alike (unlike GET /admin/staff, admin-only),
  // no PII beyond name (see StaffBridgeEmployeeListItem on the backend).
  getBridgeEmployees: async (): Promise<BridgeEmployeeListItem[]> => {
    const { data } = await apiClient.get(ENDPOINTS.ADMIN.BRIDGE_EMPLOYEES);
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

  // Tailor-only: marks an IN_REPAIR order's repair done, chaining straight
  // into a fresh INSPECTION_WINDOW (server-side, see repair_service.
  // complete_repair) - distinct from updateStitchingStatus since this isn't
  // a plain status PATCH, it's a dedicated two-step transition.
  completeRepair: async (orderId: string) => {
    const { data } = await apiClient.post(ENDPOINTS.ORDERS.COMPLETE_REPAIR(orderId));
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

  // Admin recovery tool for stuck orders — force-restarts tailor broadcast
  // regardless of current status. No request body.
  triggerBroadcast: async (
    orderId: string,
  ): Promise<{ message: string; order_id: number; status: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.ORDER_BROADCAST(orderId));
    return data;
  },

  acceptOrder: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_ACCEPT(orderId));
    return data;
  },

  // Employee-side tailor assignment — distinct from assignTailor above
  // (that's the admin-only /admin/orders/{id}/assign-tailor endpoint).
  // Requires the order to already be claimed by this employee, and a
  // measurement to already exist on the order (see
  // employee_assign_tailor / _ensure_measurement_for_assignment in
  // app/services/orders/employee_order_service.py).
  assignTailorEmployee: async (
    orderId: string,
    payload: AssignTailorRequest,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(
      ENDPOINTS.EMPLOYEE.ORDER_ASSIGN_TAILOR(orderId),
      payload,
    );
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

  // Employee-side measurement collection — distinct from updateMeasurement
  // above (that's the admin-only /admin/orders/{id}/measurement endpoint).
  // Accepts either measurement_id (attach an existing saved customer
  // profile) or profile_name + fields (creates a new reusable profile).
  collectMeasurement: async (
    orderId: string,
    payload: EmployeeOrderMeasurementRequest,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.post(
      ENDPOINTS.EMPLOYEE.ORDER_MEASUREMENT(orderId),
      payload,
    );
    return data;
  },

  completeOrder: async (orderId: string): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_COMPLETE(orderId));
    return data;
  },

  // Customer declined to accept the finished garment at the door. Backend
  // handles penalty/refund math and schedules the return with this same
  // delivery employee directly (no re-broadcast) - this call just reports
  // the reason the employee enters.
  refuseDelivery: async (
    orderId: string,
    reason: string,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.patch(ENDPOINTS.EMPLOYEE.ORDER_REFUSE_DELIVERY(orderId), {
      reason,
    });
    return data;
  },

  // Employee notices at pickup that the customer also wants an extra (e.g.
  // a button replaced) that wasn't selected online - adds the add-on's
  // GST-inclusive price to the order's balance due. Collecting that extra
  // amount is a separate step via collectPayment below, same COD-balance
  // flow as any other outstanding balance.
  addOrderAddon: async (
    orderId: string,
    payload: EmployeeAddOrderAddonRequest,
  ): Promise<EmployeeOrderActionResponse> => {
    const { data } = await apiClient.post(ENDPOINTS.EMPLOYEE.ORDER_ADD_ADDON(orderId), payload);
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

  // Creates (or resumes) the single-use UPI QR for the exact balance due. The
  // backend settles the order automatically once the customer pays.
  createDeliveryPaymentQr: async (orderId: string): Promise<DeliveryPaymentStatus> => {
    const { data } = await apiClient.post<DeliveryPaymentStatus>(
      ENDPOINTS.EMPLOYEE.ORDER_PAYMENT_QR(orderId),
    );
    return data;
  },

  getDeliveryPaymentStatus: async (orderId: string): Promise<DeliveryPaymentStatus> => {
    const { data } = await apiClient.get<DeliveryPaymentStatus>(
      ENDPOINTS.EMPLOYEE.ORDER_PAYMENT_STATUS(orderId),
    );
    return data;
  },

  cancelDeliveryPaymentQr: async (orderId: string): Promise<DeliveryPaymentStatus> => {
    const { data } = await apiClient.post<DeliveryPaymentStatus>(
      ENDPOINTS.EMPLOYEE.ORDER_PAYMENT_QR_CANCEL(orderId),
    );
    return data;
  },

  getBroadcastStatus: async (orderId: string): Promise<OrderBroadcastStatus> => {
    const { data } = await apiClient.get<OrderBroadcastStatus>(
      ENDPOINTS.ORDERS.BROADCAST_STATUS(orderId),
    );
    return data;
  },

  // Returns raw PDF bytes (application/pdf) — see downloadInvoice in
  // features/orders/hooks/useOrders.ts for the file-write + share flow.
  // arraybuffer, not the app's usual JSON responseType, since this is a
  // binary download, not an API resource.
  getInvoiceBytes: async (orderId: string): Promise<ArrayBuffer> => {
    const { data } = await apiClient.get<ArrayBuffer>(ENDPOINTS.ORDERS.INVOICE(orderId), {
      responseType: 'arraybuffer',
    });
    return data;
  },
};
