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
