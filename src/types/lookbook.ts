// Mirrors app/api/v1/endpoints/lookbook.py's in-file schemas (not in
// app/schemas/ — this subsystem defines its Pydantic models locally).
export interface LookbookItem {
  id: string;
  title?: string | null;
  image_url?: string | null;
  category_tag?: string | null;
  service_id?: string | null;
  caption?: string | null;
  display_order: number;
}

export interface LookbookAdminItem extends LookbookItem {
  is_active: boolean;
}

export interface LookbookCreateRequest {
  title?: string;
  image_url: string;
  category_tag?: string;
  service_id?: number;
  caption?: string;
  display_order?: number;
}

export interface LookbookUpdateRequest {
  title?: string;
  image_url?: string;
  category_tag?: string;
  service_id?: number;
  caption?: string;
  display_order?: number;
  is_active?: boolean;
}
