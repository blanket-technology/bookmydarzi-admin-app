// Mirrors app/api/v1/endpoints/employee.py's list_delivery_broadcast_offers
// response shape and EmployeeOnlineStatusResponse schema.
export interface DeliveryPickupInfo {
  tailor_id?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
