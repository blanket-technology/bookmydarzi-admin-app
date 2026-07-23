// Mirrors backend app/models/order_progress_photo.py + the response shapes
// returned by GET/POST /api/v1/orders/{order_id}/photos (see
// app/api/v1/endpoints/orders.py). These are timeline events, not order
// statuses — uploading a photo never changes Order.Status.
export type ProgressPhotoStage =
  | 'measuring'
  | 'stitching_started'
  | 'in_progress'
  | 'final_check'
  | 'delivered';

export interface ProgressPhoto {
  id: number;
  photo_url: string;
  tailor_id: number | null;
  stage: ProgressPhotoStage | string;
  caption: string | null;
  sequence: number;
  visible_to_customer: boolean;
  uploaded_at: string | null;
}

export interface OrderProgressPhotosResponse {
  order_id: number;
  photos: ProgressPhoto[];
}

export interface UploadProgressPhotoRequest {
  uri: string;
  fileName?: string;
  mimeType?: string;
  stage?: ProgressPhotoStage;
  caption?: string;
  visibleToCustomer?: boolean;
}
