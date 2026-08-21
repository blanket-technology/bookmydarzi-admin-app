import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { OfferItem, OfferCreateRequest, OfferUpdateRequest } from '@/types/offers';

export const offersService = {
  list: async (): Promise<OfferItem[]> => {
    const { data } = await apiClient.get<OfferItem[]>(ENDPOINTS.ADMIN.HOMEPAGE_OFFERS);
    return data;
  },

  create: async (payload: OfferCreateRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_OFFERS, payload);
    return data;
  },

  update: async (id: number, payload: OfferUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.HOMEPAGE_OFFER(String(id)), payload);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await apiClient.delete(ENDPOINTS.ADMIN.HOMEPAGE_OFFER(String(id)));
    return data;
  },

  uploadImage: async (file: { uri: string; fileName?: string; mimeType?: string }) => {
    const formData = new FormData();
    // React Native FormData accepts this shape; matches useUploadCatalogImageMutation's pattern.
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'offer_image.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id: string }>(
      ENDPOINTS.ADMIN.HOMEPAGE_OFFER_UPLOAD_IMAGE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
