// Mirrors app/api/v1/endpoints/broadcast.py's _privacy_safe_order dict shape.
// Deliberately excludes customer name/phone/full address/amounts — the
// backend never sends them to a tailor before they accept.

export interface BroadcastItemMeasurement {
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
}

export interface BroadcastItemAddon {
  name: string;
  note?: string | null;
}

export interface BroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  quantity: number;
  /** Who this garment is for (male/female/kids/other) - not the customer's
   * name, just the fit/gender to stitch for. */
  gender?: string | null;
  /** Customer's own note for this specific garment, if any. */
  notes?: string | null;
  stitching_preferences?: Record<string, unknown> | null;
  measurement?: BroadcastItemMeasurement | null;
  addons?: BroadcastItemAddon[];
}

export interface BroadcastOffer {
  order_id: string;
  order_code?: string | null;
  service_name?: string | null;
  category_name?: string | null;
  garment_count: number;
  pickup_area?: string | null;
  /** Rounded to the nearest 0.5 km server-side (see _privacy_safe_order in
   * app/api/v1/endpoints/broadcast.py) - coarse enough to never leak a
   * street-level fix on the customer's address, precise enough to help the
   * tailor judge the job at a glance. Null when either side's coordinates
   * aren't on file. */
  distance_km?: number | null;
  status: string;
  created_at?: string | null;
  urgency_level?: string | null;
  expected_delivery_date?: string | null;
  /** Whole days from now until expected_delivery_date - 0 or negative means
   * already at/past the expected date. Compute-once on the backend so the
   * tailor never has to do this math themselves mid-decision. */
  tat_days?: number | null;
  description?: string | null;
  fabric_notes?: string | null;
  customization_notes?: string | null;
  cloth_details?: string | null;
  /** JSON object on the backend (Order.StitchingPreferences), e.g.
   * {"collar": "mandarin", "sleeve": "full"} - never a plain string. */
  stitching_preferences?: Record<string, unknown> | null;
  // Optional even though the backend always sends it now - defends against
  // a stale cached response (from before this field existed) or an app
  // build still running against an older deployed backend, either of which
  // would otherwise crash on offer.items.length with no items array at all.
  items?: BroadcastItem[];
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
