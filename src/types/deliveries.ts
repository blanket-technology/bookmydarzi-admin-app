// Mirrors app/api/v1/endpoints/employee.py's list_delivery_broadcast_offers
// response shape and EmployeeOnlineStatusResponse schema.
export interface DeliveryPickupInfo {
  tailor_id?: number | null;
  tailor_name?: string | null;
  tailor_mobile?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Employee -> tailor distance for this leg (nearest 0.5 km).
  distance_km?: number | null;
}

export interface DeliveryDropInfo {
  full_name?: string | null;
  mobile?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Tailor -> customer distance for this leg (the real second-leg trip
  // distance, not employee -> customer) - nearest 0.5 km.
  distance_km?: number | null;
}

export interface DeliveryBroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  quantity: number;
}

export interface DeliveryBroadcastOffer {
  broadcast_id: string;
  order_id: string;
  order_code?: string | null;
  status: string;
  broadcast_round?: number | null;
  notified_at?: string | null;
  expires_at?: string | null;
  pickup?: DeliveryPickupInfo | null;
  drop?: DeliveryDropInfo | null;
  items?: DeliveryBroadcastItem[];
}

export interface DeliveryBroadcastOffersResponse {
  broadcasts: DeliveryBroadcastOffer[];
  total: number;
}

export interface EmployeeOnlineStatus {
  is_online: boolean;
  latitude?: number | null;
  longitude?: number | null;
}
