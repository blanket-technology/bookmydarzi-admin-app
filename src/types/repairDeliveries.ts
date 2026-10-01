// Mirrors app/api/v1/endpoints/employee.py's list_repair_delivery_broadcast_offers
// response shape. Pickup = the tailor's location (repaired garment is
// there, needs to get back to the customer) - same geography as the
// original delivery leg.
export interface RepairDeliveryPickupInfo {
  tailor_id?: number | null;
  tailor_name?: string | null;
  tailor_mobile?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RepairDeliveryDropInfo {
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

export interface RepairDeliveryBroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  quantity: number;
}

export interface RepairDeliveryBroadcastOffer {
  broadcast_id: string;
  order_id: string;
  order_code?: string | null;
  status: string;
  broadcast_round?: number | null;
  notified_at?: string | null;
  expires_at?: string | null;
  pickup?: RepairDeliveryPickupInfo | null;
  drop?: RepairDeliveryDropInfo | null;
  items?: RepairDeliveryBroadcastItem[];
}

export interface RepairDeliveryBroadcastOffersResponse {
  broadcasts: RepairDeliveryBroadcastOffer[];
  total: number;
}
