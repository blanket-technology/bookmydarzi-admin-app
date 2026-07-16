import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';

export const homepageService = {
  getBanners: async () => {
    const { data } = await apiClient.get(ENDPOINTS.ADMIN.HOMEPAGE_BANNERS);
    return data;
  },
  createBanner: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_BANNERS, payload);
    return data;
  },
  updateBanner: async (bannerId: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.HOMEPAGE_BANNER(bannerId), payload);
    return data;
  },
  deleteBanner: async (bannerId: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.ADMIN.HOMEPAGE_BANNER(bannerId));
    return data;
  },
  getCategories: async () => {
    const { data } = await apiClient.get(ENDPOINTS.ADMIN.HOMEPAGE_CATEGORIES);
    return data;
  },
  createCategory: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_CATEGORIES, payload);
    return data;
  },
  updateCategory: async (categoryId: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch(
      ENDPOINTS.ADMIN.HOMEPAGE_CATEGORY(categoryId),
      payload,
    );
    return data;
  },
  deleteCategory: async (categoryId: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.ADMIN.HOMEPAGE_CATEGORY(categoryId));
    return data;
  },
  getOffers: async () => {
    const { data } = await apiClient.get(ENDPOINTS.ADMIN.HOMEPAGE_OFFERS);
    return data;
  },
  createOffer: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_OFFERS, payload);
    return data;
  },
  updateOffer: async (offerId: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch(ENDPOINTS.ADMIN.HOMEPAGE_OFFER(offerId), payload);
    return data;
  },
  deleteOffer: async (offerId: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.ADMIN.HOMEPAGE_OFFER(offerId));
    return data;
  },
  clearCache: async () => {
    const { data } = await apiClient.post(ENDPOINTS.ADMIN.HOMEPAGE_CACHE_CLEAR);
    return data;
  },
};
