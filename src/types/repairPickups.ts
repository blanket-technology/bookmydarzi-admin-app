// Mirrors app/api/v1/endpoints/employee.py's list_repair_pickup_broadcast_offers
// response shape. Pickup = the customer's address (garment is there right
// now, needs to get to the tailor after an issue is reported) - same
// geography as the original pickup leg, reversed drop target.
export interface RepairPickupPickupInfo {
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

export interface RepairPickupDropInfo {
  tailor_id?: number | null;
  tailor_name?: string | null;
  tailor_mobile?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RepairPickupBroadcastItem {
  service_name?: string | null;
  category_name?: string | null;
  quantity: number;
}

export interface RepairPickupBroadcastOffer {
  broadcast_id: string;
  order_id: string;
  order_code?: string | null;
  status: string;
  broadcast_round?: number | null;
  notified_at?: string | null;
  expires_at?: string | null;
  pickup?: RepairPickupPickupInfo | null;
  drop?: RepairPickupDropInfo | null;
  items?: RepairPickupBroadcastItem[];
}

export interface RepairPickupBroadcastOffersResponse {
  broadcasts: RepairPickupBroadcastOffer[];
  total: number;
}
