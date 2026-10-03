// Mirrors app/api/v1/endpoints/employee.py's list_pickup_broadcast_offers
// response shape. Unlike delivery (tailor pickup -> customer drop), a pickup
// offer has a single location: the customer's address the cloth is collected
// FROM.
export interface PickupAddressInfo {
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
  // Real server-computed distance from the employee's own current location
  // to this pickup point (rounded to nearest 0.5 km) - mirrors the tailor
  // broadcast side's identical distance_km field.
  distance_km?: number | null;
}

export interface PickupBroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  quantity: number;
}

export interface PickupBroadcastOffer {
  broadcast_id: string;
  order_id: string;
  order_code?: string | null;
  status: string;
  broadcast_round?: number | null;
  notified_at?: string | null;
  expires_at?: string | null;
  pickup?: PickupAddressInfo | null;
  items?: PickupBroadcastItem[];
}

export interface PickupBroadcastOffersResponse {
  broadcasts: PickupBroadcastOffer[];
  total: number;
}
