// Mirrors app/schemas/measurement.py. Distinct from AdminOrderMeasurementRequest
// (types/orders.ts) — this is the customer-level, reusable saved-profile
// system (USER_MEASUREMENTS table), not measurement fields inline on an order.
export interface MeasurementProfile {
  id: string;
  user_id: string;
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
  is_default: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface MeasurementListResponse {
  measurements: MeasurementProfile[];
  total: number;
  default_measurement_id?: string | null;
  suggested_profile_name?: string | null;
}

export interface MeasurementCreateRequest {
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

export type MeasurementUpdateRequest = Partial<MeasurementCreateRequest>;

// POST /employee/orders/{id}/measurement (EmployeeMeasurementRequest) — either
// measurement_id (attach an existing saved profile) OR profile_name + fields
// (creates a brand-new saved profile the customer can reuse on future orders).
export interface EmployeeOrderMeasurementRequest {
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
