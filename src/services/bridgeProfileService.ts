import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { BridgeProfileSelf, BridgeProfileSelfUpdateRequest } from '@/types/bridgeProfile';

export const bridgeProfileService = {
  getMy: async (): Promise<BridgeProfileSelf> => {
    const { data } = await apiClient.get<BridgeProfileSelf>(ENDPOINTS.EMPLOYEE.MY_BRIDGE_PROFILE);
    return data;
  },

  updateMy: async (payload: BridgeProfileSelfUpdateRequest): Promise<BridgeProfileSelf> => {
    const { data } = await apiClient.patch<BridgeProfileSelf>(
      ENDPOINTS.EMPLOYEE.MY_BRIDGE_PROFILE,
      payload,
    );
    return data;
  },
};
