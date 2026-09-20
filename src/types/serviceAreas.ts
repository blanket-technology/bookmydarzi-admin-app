// Mirrors app/schemas/location.py's ServiceAreaSchema/Create/Update.
export interface ServiceArea {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_active: boolean;
}

export interface ServiceAreaCreateRequest {
  name: string;
  latitude: number;
  longitude: number;
  radius_km?: number;
  is_active?: boolean;
}

export interface ServiceAreaUpdateRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  is_active?: boolean;
}

// Mirrors app/api/v1/endpoints/location.py's ServiceAreaInterestOut -
// a read-only "notify me" lead captured when a customer's booking is
// rejected as outside the current service area (POST
// /location/service-area-interest, public/customer-facing).
export interface ServiceAreaInterest {
  id: number;
  customer_name: string | null;
  customer_mobile: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  pincode: string | null;
  address_text: string | null;
  created_at: string;
}

export interface ServiceAreaInterestsResponse {
  total: number;
  skip: number;
  limit: number;
  items: ServiceAreaInterest[];
}
