// Mirrors app/api/v1/endpoints/admin_reviews.py's AdminReviewItem - a plain
// Pydantic BaseModel (snake_case, not the app's usual PascalCase
// BaseSchema convention), so this type matches the JSON keys directly.
export interface AdminReview {
  id: number;
  order_id: number;
  order_code?: string | null;
  customer_name?: string | null;
  rating: number;
  comment?: string | null;
  is_hidden: boolean;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at?: string | null;
}

export interface AdminReviewListResponse {
  reviews: AdminReview[];
  total: number;
}

export interface AdminReviewListParams {
  hidden?: boolean;
  min_rating?: number;
  max_rating?: number;
  page?: number;
  limit?: number;
}
