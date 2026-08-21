import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { BroadcastOffersResponse, TailorOnlineStatus } from '@/types/broadcasts';

export const broadcastService = {
  // Privacy-safe order offers currently pending for this tailor — no
  // customer name/phone/address/amount, per _privacy_safe_order server-side.
  list: async (params?: { page?: number; limit?: number }): Promise<BroadcastOffersResponse> => {
    const { data } = await apiClient.get<BroadcastOffersResponse>(ENDPOINTS.TAILOR.BROADCASTS, {
      params,
    });
    return data;
  },

  // First-come-first-served — the backend row-locks the order, so a losing
  // request after another tailor already accepted fails with a normal error
  // (order no longer in 'broadcasted' status), not a silent no-op.
  accept: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.TAILOR.BROADCAST_ACCEPT(orderId));
    return data;
  },

  decline: async (orderId: string) => {
    const { data } = await apiClient.patch(ENDPOINTS.TAILOR.BROADCAST_DECLINE(orderId));
    return data;
  },

  // Without this a tailor's Tailor.IsOnline stays permanently False (its DB
  // default), so broadcast_service.py's candidate filter never includes
  // them and this screen's offers list stays empty regardless of how many
  // orders are actually being broadcast nearby.
  setOnlineStatus: async (payload: {
    is_online: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<TailorOnlineStatus> => {
    const { data } = await apiClient.patch<TailorOnlineStatus>(
      ENDPOINTS.TAILOR.ONLINE_STATUS,
      payload,
    );
    return data;
  },
};
