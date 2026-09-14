// Mirrors app/api/v1/endpoints/employee.py's list_return_broadcast_offers
// response shape - identical to DeliveryBroadcastOffer/*Info (deliveries.ts)
// since a return trip has the same tailor -> customer geography as a
// delivery, only the order status/intent differs.
export interface ReturnPickupInfo {
  tailor_id?: number | null;
  tailor_name?: string | null;
  tailor_mobile?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ReturnDropInfo {
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
}

export interface ReturnBroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  quantity: number;
}

export interface ReturnBroadcastOffer {
  broadcast_id: string;
  order_id: string;
  order_code?: string | null;
  status: string;
  broadcast_round?: number | null;
  notified_at?: string | null;
  expires_at?: string | null;
  pickup?: ReturnPickupInfo | null;
  drop?: ReturnDropInfo | null;
  items?: ReturnBroadcastItem[];
}

export interface ReturnBroadcastOffersResponse {
  broadcasts: ReturnBroadcastOffer[];
  total: number;
}
