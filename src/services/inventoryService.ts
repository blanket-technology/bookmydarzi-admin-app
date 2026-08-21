import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  InventoryCreateRequest,
  InventoryItem,
  InventoryUpdateRequest,
} from '@/types/inventory';

export const inventoryService = {
  list: async (): Promise<InventoryItem[]> => {
    const { data } = await apiClient.get<InventoryItem[]>(ENDPOINTS.INVENTORY.LIST);
    return data;
  },

  create: async (payload: InventoryCreateRequest): Promise<InventoryItem> => {
    const { data } = await apiClient.post<InventoryItem>(ENDPOINTS.INVENTORY.LIST, payload);
    return data;
  },

  update: async (id: string, payload: InventoryUpdateRequest): Promise<InventoryItem> => {
    const { data } = await apiClient.patch<InventoryItem>(
      ENDPOINTS.INVENTORY.DETAIL(id),
      payload,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.INVENTORY.DETAIL(id));
  },
};
