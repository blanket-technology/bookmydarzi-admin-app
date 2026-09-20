// Mirrors app/schemas/service_catalog.py's admin write schemas + tree read
// shape. 3-level hierarchy: ServiceCategory -> ServiceLine -> Service
// (aka ServiceSubCategory server-side — the bookable leaf item).
// GET /catalog/services/{id}/addons - optional, separately-priced extras
// scoped to one specific service (e.g. Shirt Repair's own Button
// Replacement/Shoulder Adjustment/Length Shortening).
export interface ServiceAddon {
  id: number;
  service_id: number;
  name: string;
  description?: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
}

export interface ServiceAddonPayload {
  name: string;
  description?: string;
  price: number;
  display_order?: number;
  is_active?: boolean;
}

export interface StitchingTypeSummary {
  service_id: string;
  name: string;
  description?: string | null;
  base_price: number;
  estimated_delivery_days: number;
  display_order: number;
  is_premium: boolean;
  is_active: boolean;
  image_url?: string | null;
  highlights: string[];
  service_line_id?: string | null;
  service_line_name?: string | null;
  category_id: string;
  category_name: string;
  /** Repair/Resize/Restyle grouping, only meaningful for a Custom
   * Alterations service. Null if not yet explicitly assigned. */
  alteration_group?: 'repair' | 'resize' | 'restyle' | null;
}

export interface ServiceLineTree {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  image_url?: string | null;
  starting_price?: number | null;
  is_active: boolean;
  stitching_types: StitchingTypeSummary[];
}

export interface CategoryTree {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  service_lines: ServiceLineTree[];
  direct_services: StitchingTypeSummary[];
}

export interface CatalogTreeResponse {
  categories: CategoryTree[];
  total: number;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface ServiceLinePayload {
  name: string;
  category_id: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface ServicePayload {
  name: string;
  category_id: string;
  service_line_id?: string;
  description?: string;
  image_url?: string;
  base_price?: number;
  estimated_delivery_days?: number;
  display_order?: number;
  is_premium?: boolean;
  is_active?: boolean;
  highlights?: string[];
  alteration_group?: 'repair' | 'resize' | 'restyle' | null;
}
