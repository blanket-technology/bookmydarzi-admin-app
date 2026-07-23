// Mirrors backend app/constants/order_status.py OrderStatus.ALL — keep in sync.
export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'order_placed'
  | 'order_accepted'
  | 'order_rejected'
  | 'searching_tailor'
  | 'broadcasted'
  | 'tailor_assigned'
  | 'pickup_scheduled'
  | 'pickup_pending'
  | 'picked_up'
  | 'cloth_received_by_tailor'
  | 'stitching_started'
  | 'in_progress'
  | 'final_check'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface AdminOrderItem {
  order_id: string;
  order_code?: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  service_name?: string;
  category_name?: string;
  status: OrderStatus | string;
  payment_status?: string;
  final_amount?: number;
  amount?: number;
  booking_amount?: number;
  remaining_amount?: number;
  tailor_id?: string;
  tailor_name?: string;
  urgency_level?: string;
  pickup_type?: 'instant' | 'scheduled' | string;
  scheduled_pickup_at?: string;
  created_at?: string;
  expected_delivery_date?: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrderItem[];
  total: number;
  page: number;
  limit: number;
}

// Raw shape shared by GET /admin/orders AND GET /orders/my-orders — both
// endpoints serialize app/schemas/order.py OrderResponse/OrderListResponse
// directly (PascalCase, no denormalized customer_name/tailor_name fields —
// only CustomerId/TailorId plus the nested `address`, which has the
// customer's name/mobile). Normalized to AdminOrderItem client-side by
// orderService.normalizeOrderResponse so existing screens (orders/index.tsx,
// orders/[id].tsx) never touch the raw shape.
export interface MyOrderAddress {
  full_name: string;
  mobile: string;
  address_line_1: string;
  city: string;
}

export interface MyOrderItem {
  Id: number;
  OrderCode?: string | null;
  OrderNumber?: string | null;
  CustomerId: number;
  TailorId?: number | null;
  TailorSpecialization?: string | null;
  ServiceName?: string | null;
  ServiceTitle?: string | null;
  ServiceSubtitle?: string | null;
  Status: string;
  StatusLabel?: string | null;
  PaymentStatus?: string | null;
  FinalAmount: number;
  BookingAmount?: number;
  RemainingAmount?: number;
  UrgencyLevel?: string | null;
  PickupType?: string | null;
  ScheduledPickupAt?: string | null;
  ExpectedDeliveryDate?: string | null;
  CreatedAt: string;
  address?: MyOrderAddress | null;
}

export interface MyOrdersResponse {
  orders: MyOrderItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AssignTailorRequest {
  tailor_id: string;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus | string;
  notes?: string;
}

export interface AdminCancelOrderRequest {
  reason: string;
}

export interface OrderNotesRequest {
  description?: string | null;
  fabric_notes?: string | null;
  customization_notes?: string | null;
  cloth_details?: string | null;
}

export interface AdminOrderMeasurementRequest {
  measurement_id?: string;
  profile_name?: string;
  gender?: string;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  neck?: number;
  sleeve_length?: number;
  inseam?: number;
  height?: number;
  fit_preference?: string;
  notes?: string;
  is_default?: boolean;
}

export interface OrdersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface SchedulePickupRequest {
  pickup_type?: 'instant' | 'scheduled';
  scheduled_pickup_at?: string;
  pickup_time_slot?: string;
}

export interface RejectOrderRequest {
  reason?: string;
}

export interface CollectPaymentRequest {
  method: 'qr' | 'cash';
  amount: number;
  notes?: string;
}

export interface CollectPaymentResponse {
  message: string;
  order_id: number;
  order_code: string | null;
  amount_collected: number;
  payment_method: string;
  remaining_amount: number;
}

export interface EmployeeOrderActionResponse {
  message: string;
  order: AdminOrderItem;
  warning?: string | null;
}
