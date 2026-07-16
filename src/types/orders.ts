export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'measurement_updated'
  | 'tailor_assigned'
  | 'in_progress'
  | 'quality_check'
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
  tailor_id?: string;
  tailor_name?: string;
  urgency_level?: string;
  created_at?: string;
  expected_delivery_date?: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrderItem[];
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
