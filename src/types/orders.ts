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
  | 'cancelled'
  | 'return_pending'
  | 'return_scheduled'
  | 'return_in_transit'
  | 'returned';

// Mirrors app/schemas/measurement.py MeasurementResponseSchema — the same
// fields AdminOrderMeasurementRequest below can edit, but this is what's
// actually attached to the order already (order_response_builder.py's
// `measurement` field), read-only display shape.
interface RawOrderMeasurement {
  id: number;
  profile_name: string;
  gender?: string | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulder?: number | null;
  neck?: number | null;
  sleeve_length?: number | null;
  inseam?: number | null;
  height?: number | null;
  fit_preference?: string | null;
  notes?: string | null;
}

// Normalized shape (id stringified, matching every other id field in
// AdminOrderItem) — what orders/[id].tsx actually consumes.
export interface OrderMeasurement extends Omit<RawOrderMeasurement, 'id'> {
  id: string;
}

/** Normalized (snake_case) per-line-item summary - see RawOrderItemSummary. */
export interface OrderItemAddon {
  addon_id: number | null;
  name: string;
  price: number;
  note?: string | null;
}

export interface OrderLineItem {
  order_item_id: number | null;
  service_id: number | null;
  service_name: string | null;
  category_name: string | null;
  image_url: string | null;
  quantity: number;
  price: number | null;
  person_name: string | null;
  gender: string | null;
  has_measurement: boolean;
  /** Optional extras selected at booking time (e.g. Button Replacement,
   * Shoulder Adjustment) - already folded into `price` above, listed here
   * so the tailor/bridge actually knows what extra work to do. */
  addons?: OrderItemAddon[];
}

export interface AdminOrderItem {
  order_id: string;
  order_code?: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  /** Full delivery address, previously discarded by normalizeOrderResponse
   * (only full_name/mobile were kept, denormalized onto customer_name/
   * customer_mobile above) - kept whole here so the order-detail screen can
   * actually show it, matching the web admin panel's Delivery Address card. */
  address?: MyOrderAddress | null;
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
  description?: string | null;
  fabric_notes?: string | null;
  customization_notes?: string | null;
  cloth_details?: string | null;
  assigned_employee_id?: string;
  /** Return-leg employee (post-cancellation reverse trip) - only set once an
   * employee has accepted the order's return broadcast. */
  return_employee_id?: string;
  measurement?: OrderMeasurement | null;
  /** True when the tailor broadcast exhausted every round (including the
   * all-tailor fallback) with zero acceptance - needs manual assignment. */
  needs_manual_assignment?: boolean;
  broadcast_exhausted_at?: string | null;
  /** Every booked service on this order - cart orders can have several,
   * each needing its own measurement. Always at least one entry when the
   * backend has anything to report (falls back to a synthetic single entry
   * for legacy direct orders with no ORDER_ITEMS rows). */
  items: OrderLineItem[];
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
  address_line_2?: string | null;
  landmark?: string | null;
  city: string;
  state?: string | null;
  pincode?: string | null;
  address_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** One booked service within an order (backend OrderItemSummary). A
 * direct/buy-now order has exactly one; a cart-checkout order can have
 * several (e.g. Men's Shirt + Kids Clothing in the same booking), each
 * needing its own measurement. */
export interface RawOrderItemSummary {
  order_item_id?: number | null;
  service_id?: number | null;
  service_name?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  quantity: number;
  price?: number | null;
  person_name?: string | null;
  gender?: string | null;
  has_measurement: boolean;
  addons?: OrderItemAddon[];
}

export interface MyOrderItem {
  Id: number;
  OrderCode?: string | null;
  OrderNumber?: string | null;
  CustomerId: number;
  TailorId?: number | null;
  TailorSpecialization?: string | null;
  TailorName?: string | null;
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
  measurement?: RawOrderMeasurement | null;
  Description?: string | null;
  /** True when the tailor broadcast exhausted every round (including the
   * all-tailor fallback) with zero acceptance - Bridge/admin should
   * manually assign a tailor. Cleared automatically once a tailor is
   * assigned, by either path. */
  NeedsManualAssignment?: boolean;
  BroadcastExhaustedAt?: string | null;
  FabricNotes?: string | null;
  CustomizationNotes?: string | null;
  ClothDetails?: string | null;
  AssignedEmployeeId?: number | null;
  ReturnEmployeeId?: number | null;
  Items?: RawOrderItemSummary[] | null;
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
  waive_penalty?: boolean;
}

export interface OrderNotesRequest {
  description?: string | null;
  fabric_notes?: string | null;
  customization_notes?: string | null;
  cloth_details?: string | null;
}

export interface AdminOrderMeasurementRequest {
  /** Required when the order has more than one item - which garment/person
   * this measurement is for. Optional for single-item orders. */
  order_item_id?: number;
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
  payment_status?: string;
  tailor_id?: string;
  customer_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  /** true = only orders where the tailor broadcast exhausted every round
   * (including the all-tailor fallback) with zero acceptance - the "needs
   * manual assignment" worklist, oldest-stuck-first. */
  needs_manual_assignment?: boolean;
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

/** Bridge/employee adds an add-on to an already-placed order at pickup
 * (e.g. noticing the shirt also needs a button replaced) - increases the
 * order's balance due; collecting that extra amount is a separate
 * CollectPaymentRequest call. See POST /employee/orders/{id}/addons. */
export interface EmployeeAddOrderAddonRequest {
  order_item_id?: number;
  addon_id: number;
  note?: string;
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

// Mirrors GET /tailor/orders/{order_id}/broadcast/status (broadcast.py's
// get_broadcast_status) — one row per tailor offered this order, across all
// broadcast rounds. Admin/employee only.
export interface OrderBroadcastAttempt {
  id: string;
  tailor_id: string;
  status: string;
  round: number;
  notified_at?: string | null;
  responded_at?: string | null;
  expires_at?: string | null;
}

export interface OrderBroadcastStatus {
  order_id: string;
  broadcasts: OrderBroadcastAttempt[];
  total: number;
}
