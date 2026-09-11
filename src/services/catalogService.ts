import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  CatalogTreeResponse,
  CategoryPayload,
  ServiceAddon,
  ServiceLinePayload,
  ServicePayload,
} from '@/types/catalog';

export const catalogService = {
  // Admin tree includes inactive items — the public /categories/tree hides
  // them, which would make deactivated content invisible to manage.
  getAdminTree: async (): Promise<CatalogTreeResponse> => {
    const { data } = await apiClient.get<CatalogTreeResponse>(ENDPOINTS.CATALOG.ADMIN_TREE);
    return data;
  },

  uploadImage: async (
    uri: string,
    fileName?: string,
    mimeType?: string,
  ): Promise<{ url: string; file_id: string }> => {
    const form = new FormData();
    form.append('file', {
      uri,
      name: fileName ?? `catalog-${Date.now()}.jpg`,
      type: mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id: string }>(
      ENDPOINTS.CATALOG.UPLOAD_IMAGE,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  createCategory: async (payload: CategoryPayload) => {
    const { data } = await apiClient.post(ENDPOINTS.CATALOG.CATEGORIES, payload);
    return data;
  },
  updateCategory: async (id: string, payload: Partial<CategoryPayload>) => {
    const { data } = await apiClient.patch(ENDPOINTS.CATALOG.CATEGORY_DETAIL(id), payload);
    return data;
  },
  deleteCategory: async (id: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.CATALOG.CATEGORY_DETAIL(id));
    return data;
  },

  createServiceLine: async (payload: ServiceLinePayload) => {
    const { data } = await apiClient.post(ENDPOINTS.CATALOG.SERVICE_LINES, payload);
    return data;
  },
  updateServiceLine: async (id: string, payload: Partial<ServiceLinePayload>) => {
    const { data } = await apiClient.patch(ENDPOINTS.CATALOG.SERVICE_LINE_DETAIL(id), payload);
    return data;
  },
  deleteServiceLine: async (id: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.CATALOG.SERVICE_LINE_DETAIL(id));
    return data;
  },

  createService: async (payload: ServicePayload) => {
    const { data } = await apiClient.post(ENDPOINTS.CATALOG.SERVICES, payload);
    return data;
  },
  updateService: async (id: string, payload: Partial<ServicePayload>) => {
    const { data } = await apiClient.patch(ENDPOINTS.CATALOG.SERVICE_DETAIL(id), payload);
    return data;
  },
  deleteService: async (id: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.CATALOG.SERVICE_DETAIL(id));
    return data;
  },

  // Public, active-only add-ons for one service - used by the employee's
  // "Add Extra Service" sheet at pickup (AddOrderAddonSheet.tsx).
  getServiceAddons: async (serviceId: string | number): Promise<ServiceAddon[]> => {
    const { data } = await apiClient.get<ServiceAddon[]>(ENDPOINTS.CATALOG.SERVICE_ADDONS(serviceId));
    return data;
  },
};
