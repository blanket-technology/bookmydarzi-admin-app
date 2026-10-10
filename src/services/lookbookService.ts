import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  LookbookAdminItem,
  LookbookCreateRequest,
  LookbookUpdateRequest,
} from '@/types/lookbook';

export const lookbookService = {
  listAdmin: async (): Promise<LookbookAdminItem[]> => {
    const { data } = await apiClient.get<LookbookAdminItem[]>(ENDPOINTS.LOOKBOOK.ADMIN_LIST);
    return data;
  },

  create: async (payload: LookbookCreateRequest): Promise<{ message: string; id: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.LOOKBOOK.ADMIN_LIST, payload);
    return data;
  },

  update: async (id: string, payload: LookbookUpdateRequest) => {
    const { data } = await apiClient.patch(ENDPOINTS.LOOKBOOK.ADMIN_DETAIL(id), payload);
    return data;
  },

  // Lookbook has its own upload route (own permission screen and storage folder);
  // the catalog upload route needs a different permission and files it under /catalog.
  uploadImage: async (file: { uri: string; fileName?: string; mimeType?: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'lookbook_image.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id?: string }>(
      ENDPOINTS.LOOKBOOK.ADMIN_UPLOAD_IMAGE,
      formData,
      // Uploads on a slow mobile connection need longer than the 30 s API default.
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 },
    );
    return data;
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete(ENDPOINTS.LOOKBOOK.ADMIN_DETAIL(id));
    return data;
  },
};
