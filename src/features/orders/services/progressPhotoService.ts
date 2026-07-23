import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  OrderProgressPhotosResponse,
  ProgressPhoto,
  UploadProgressPhotoRequest,
} from '@/types/progressPhotos';

export const progressPhotoService = {
  // GET /api/v1/orders/{order_id}/photos — visibility is enforced server-side
  // (customers only see VisibleToCustomer=true; staff and the assigned
  // tailor see everything), so no client-side filtering is needed here.
  getByOrder: async (orderId: string): Promise<OrderProgressPhotosResponse> => {
    const { data } = await apiClient.get<OrderProgressPhotosResponse>(
      ENDPOINTS.ORDERS.PHOTOS(orderId),
    );
    return data;
  },

  // POST /api/v1/orders/{order_id}/photos — tailor-only server-side
  // (require_roles(TAILOR)), and only while the order is in
  // stitching_started | in_progress | final_check. Multipart upload matching
  // the backend's UploadFile + Form(...) signature.
  upload: async (
    orderId: string,
    payload: UploadProgressPhotoRequest,
  ): Promise<ProgressPhoto> => {
    const form = new FormData();
    const fileName = payload.fileName ?? `photo-${Date.now()}.jpg`;
    const mimeType = payload.mimeType ?? 'image/jpeg';
    // React Native FormData file shape — not a real Blob, but this is the
    // standard RN/Expo pattern accepted by axios + FastAPI's UploadFile.
    form.append('photo', {
      uri: payload.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    form.append('stage', payload.stage ?? 'in_progress');
    if (payload.caption) form.append('caption', payload.caption);
    form.append('visible_to_customer', String(payload.visibleToCustomer ?? true));

    const { data } = await apiClient.post<ProgressPhoto>(
      ENDPOINTS.ORDERS.PHOTOS(orderId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
