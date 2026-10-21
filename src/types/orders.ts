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
  | 'delivery_refused'
  | 'inspection_window'
  | 'in_repair'
  | 'repair_pickup_pending'
  | 'repair_pickup_scheduled'
  | 'repair_pickup_in_transit'
  | 'at_tailor_for_repair'
  | 'repair_completed'
  | 'repair_delivery_pending'
  | 'repair_delivery_scheduled'
  | 'repair_delivery_in_transit'
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
  /** Customer's own note for this specific garment, if any. */
  notes?: string | null;
  /** Customer-supplied design reference photo (Designer/premium tiers
   * only), extracted server-side from StitchingPreferences so it can be
   * rendered as an actual image instead of raw JSON text. */
  reference_photo_url?: string | null;
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
  /** Customer-card-style category subtitle - blank for Custom Alterations
   * (see category_name below for the real, always-populated category). */
  category_name?: string;
  /** Real service category name, always populated when one exists - unlike
   * category_name above, never blanked for Custom Alterations. Prefer this
   * over category_name on tailor/admin detail screens. */
  category_name_raw?: string | null;
  /** repair | resize | restyle - set only for Custom Alterations services. */
  alteration_group?: string | null;
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
  /** Customer-supplied reference photo for a single-item/direct order
   * (multi-item orders carry it per-item on items[].reference_photo_url
   * instead - see OrderLineItem). */
  reference_photo_url?: string | null;
  /** Style-reference photos attached at cart checkout (distinct from
   * reference_photo_url above, which is a single per-item customization
   * photo) - an array since the cart screen allows more than one. */
  image_references?: string[] | null;
  /** Optional voice-note recording (order-level only) - an alternative to
   * typed notes for a customer who finds speaking easier, or a tailor who
   * reads slowly. */
  voice_note_url?: string | null;
  /** Most recent post-delivery inspection-window issue report, if any -
   * present only once the order has entered the repair sub-flow. */
  latest_repair_request?: {
    issue_description: string;
    issue_photo_urls?: string[] | null;
    reported_at: string;
    resolved_at?: string | null;
  } | null;
  assigned_employee_id?: string;
  /** Staff-only display name for assigned_employee_id (pickup-leg claim) -
   * never present on a customer-facing response even when the id is set. */
  assigned_employee_name?: string | null;
  delivery_employee_id?: string;
  delivery_employee_name?: string | null;
  /** Return-leg employee (post-cancellation reverse trip) - only set once an
   * employee has accepted the order's return broadcast. */
  return_employee_id?: string;
  return_employee_name?: string | null;
  /** Repair round-trip legs (customer<->tailor, for a reported post-delivery
   * issue) - only set once an employee has accepted the respective broadcast. */
  repair_pickup_employee_id?: string;
  repair_pickup_employee_name?: string | null;
  repair_delivery_employee_id?: string;
  repair_delivery_employee_name?: string | null;
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
  notes?: string | null;
  reference_photo_url?: string | null;
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
  CategoryName?: string | null;
  AlterationGroup?: string | null;
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
  /** IST calendar date, e.g. "2026-10-12" - what the UI should display. */
  ExpectedDeliveryDateIso?: string | null;
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
  ReferencePhotoUrl?: string | null;
  ImageReferences?: string[] | null;
  VoiceNoteUrl?: string | null;
  LatestRepairRequest?: {
    issue_description: string;
    issue_photo_urls?: string[] | null;
    reported_at: string;
    resolved_at?: string | null;
  } | null;
  AssignedEmployeeId?: number | null;
  AssignedEmployeeName?: string | null;
  DeliveryEmployeeId?: number | null;
  DeliveryEmployeeName?: string | null;
  ReturnEmployeeId?: number | null;
  ReturnEmployeeName?: string | null;
  RepairPickupEmployeeId?: number | null;
  RepairPickupEmployeeName?: string | null;
  RepairDeliveryEmployeeId?: number | null;
  RepairDeliveryEmployeeName?: string | null;
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

export interface AssignBridgeEmployeeRequest {
  employee_id: string;
}

export interface BridgeEmployeeListItem {
  employee_id: string;
  full_name: string | null;
  is_online: boolean;
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
  /** Orders whose DELIVERY leg is held by this employee (employee_id is the pickup leg). */
  delivery_employee_id?: string;
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

/** Manual collection is cash only: QR payments are confirmed by the backend
 * (Razorpay) the moment the customer pays - see DeliveryPaymentStatus. */
export interface CollectPaymentRequest {
  method: 'cash';
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


/** Delivery-time payment state - GET /employee/orders/{id}/payment-status. */
export type DeliveryPaymentState = 'pending' | 'paid' | 'expired' | 'cancelled' | 'none';

export interface DeliveryPaymentStatus {
  status: DeliveryPaymentState;
  order_id: number;
  order_code?: string | null;
  payment_code?: string | null;
  /** 'qr' | 'cash' once paid. */
  method?: string | null;
  amount?: number | null;
  amount_paise?: number | null;
  currency: string;
  qr_id?: string | null;
  /** Hosted QR image (Razorpay) - render directly. */
  qr_image_url?: string | null;
  upi_uri?: string | null;
  /** ISO-8601 UTC timestamp after which the QR no longer accepts payment. */
  expires_at?: string | null;
  transaction_id?: string | null;
}
