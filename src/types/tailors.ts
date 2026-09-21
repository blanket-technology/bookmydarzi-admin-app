// Mirrors app/schemas/staff.py AdminTailorListItem exactly — GET/PATCH/DELETE
// /admin/tailors/{id} and the bare-array GET /admin/tailors both return this
// shape. There is no active_orders/completed_orders on this schema (those
// only exist on TailorWorkloadItem, from the separate workload endpoint) —
// do not add them back here.
export interface AdminTailorListItem {
  tailor_id: string;
  user_id: string;
  user_code?: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  specialization?: string;
  experience?: number;
  location?: string;
  rating?: number;
  is_available?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  is_approved?: boolean;
  aadhar_url?: string | null;
  pan_card_url?: string | null;
  other_doc_url?: string | null;
  pan_waived?: boolean;
  pan_waiver_reason?: string | null;
  created_at?: string;
  profile_image_url?: string | null;
}

export interface UpdateTailorRequest {
  full_name?: string;
  email?: string;
  mobile?: string;
  specialization?: string;
  is_active?: boolean;
  is_available?: boolean;
}

// Employee-safe tailor fields only - GET /employee/tailors. No contact
// details or KYC document URLs (those stay in AdminTailorListItem, admin/
// superadmin only). See app/schemas/staff.py's EmployeeTailorListItem.
export interface EmployeeTailorListItem {
  tailor_id: string;
  full_name?: string;
  specialization?: string;
  location?: string;
  rating?: number;
  is_available?: boolean;
}

export interface TailorWorkloadItem {
  tailor_id: string;
  tailor_name?: string;
  active_orders?: number;
  pending_orders?: number;
  completed_orders?: number;
  utilization_percentage?: number;
  /** Live customer-rating average (Tailor.Rating) - 0 for no ratings yet. */
  rating?: number;
  /** % of (completed + cancelled) orders completed - null when the
   * tailor has no orders with a real outcome yet. */
  completion_rate_percent?: number | null;
  /** % of delivered orders (with a comparable OriginalExpectedDeliveryDate)
   * delivered on or before the original promised date - null when there's
   * no comparable data yet. */
  on_time_delivery_rate_percent?: number | null;
}

export interface AdminTailorsResponse {
  tailors?: AdminTailorListItem[];
  items?: AdminTailorListItem[];
  total?: number;
}

// Mirrors app/schemas/tailor.py TailorResponse exactly (GET/PATCH
// /tailors/me) — PascalCase, distinct from AdminTailorListItem's snake_case
// (different backend schema, different endpoint family).
export interface TailorSelfProfile {
  Id: number;
  UserId: number;
  Specialization?: string | null;
  Experience: number;
  Location?: string | null;
  Rating: number;
  IsAvailable: boolean;
  IsFeatured: boolean;
  IsOnline: boolean;
  Latitude?: number | null;
  Longitude?: number | null;
  Bio?: string | null;
  PortfolioImages?: string[] | null;
}

// Mirrors app/schemas/tailor.py TailorUpdate — only the fields a tailor can
// change about themselves via PATCH /tailors/me (is_online/latitude/
// longitude are also on this schema but are handled separately by the
// dedicated PATCH /tailors/me/online endpoint, not this form).
export interface TailorSelfProfileUpdateRequest {
  specialization?: string;
  experience?: number;
  location?: string;
  bio?: string;
  is_available?: boolean;
  portfolio_images?: string[];
}
