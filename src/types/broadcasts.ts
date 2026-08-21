// Mirrors app/api/v1/endpoints/broadcast.py's _privacy_safe_order dict shape.
// Deliberately excludes customer name/phone/full address/amounts — the
// backend never sends them to a tailor before they accept.
export interface BroadcastOffer {
  order_id: string;
  order_code?: string | null;
  service_name?: string | null;
  garment_count: number;
  pickup_area?: string | null;
  status: string;
  created_at?: string | null;
  urgency_level?: string | null;
  expected_delivery_date?: string | null;
  description?: string | null;
  fabric_notes?: string | null;
  customization_notes?: string | null;
  cloth_details?: string | null;
  stitching_preferences?: string | null;
  broadcast_id: string;
  expires_at?: string | null;
  notified_at?: string | null;
  broadcast_round?: number | null;
}

export interface BroadcastOffersResponse {
  broadcasts: BroadcastOffer[];
  total: number;
  page: number;
  limit: number;
}

// Mirrors app/schemas/tailor.py TailorResponse (PATCH /tailors/me/online) —
// PascalCase, unlike the employee's snake_case EmployeeOnlineStatus, since
// this reuses the tailor profile response rather than a dedicated schema.
export interface TailorOnlineStatus {
  Id: number;
  UserId: number;
  IsOnline: boolean;
  Latitude?: number | null;
  Longitude?: number | null;
}
