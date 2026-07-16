export interface AdminTailorListItem {
  tailor_id: string;
  user_id: string;
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
  active_orders?: number;
  completed_orders?: number;
}

export interface TailorWorkloadItem {
  tailor_id: string;
  full_name?: string;
  active_orders?: number;
  pending_orders?: number;
  completed_orders?: number;
  is_available?: boolean;
}

export interface AdminTailorsResponse {
  tailors?: AdminTailorListItem[];
  items?: AdminTailorListItem[];
  total?: number;
}
