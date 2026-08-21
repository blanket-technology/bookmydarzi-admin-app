// Mirrors app/schemas/staff.py's BridgeProfileSelfResponse/SelfUpdateRequest.
export interface BridgeProfileSelf {
  experience_years: number | null;
  bridge_type: string | null;
  assigned_area: string | null;
  vehicle_type: string | null;
  working_shift: string | null;
  is_approved: boolean;
}

export interface BridgeProfileSelfUpdateRequest {
  experience_years?: number;
  bridge_type?: string;
  assigned_area?: string;
  vehicle_type?: string;
  working_shift?: string;
}
