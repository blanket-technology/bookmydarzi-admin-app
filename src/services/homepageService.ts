import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { Banner, BannerCreateRequest, BannerUpdateRequest } from '@/types/homepage';

export const homepageService = {
  getBanners: async (): Promise<Banner[]> => {
    const { data } = await apiClient.get<Banner[]>(ENDPOINTS.ADMIN.HOMEPAGE_BANNERS);
    return data;
  },
  createBanner: async (payload: BannerCreateRequest) => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_BANNERS, payload);
    return data;
  },
  updateBanner: async (bannerId: string, payload: BannerUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.HOMEPAGE_BANNER(bannerId), payload);
    return data;
  },
  deleteBanner: async (bannerId: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.ADMIN.HOMEPAGE_BANNER(bannerId));
    return data;
  },
  clearCache: async () => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_CACHE_CLEAR);
    return data;
  },
  uploadBannerImage: async (file: { uri: string; fileName?: string; mimeType?: string }) => {
    const formData = new FormData();
    // Matches offersService.uploadImage's pattern (React Native FormData shape).
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'banner_image.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id: string }>(
      ENDPOINTS.ADMIN.HOMEPAGE_BANNER_UPLOAD_IMAGE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
