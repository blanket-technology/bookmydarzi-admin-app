import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  ChatMessagesResponse,
  ChatQuickRepliesResponse,
  ChatSessionListResponse,
  ChatSessionsQueryParams,
} from '@/types/chat';

export const chatService = {
  listSessions: async (params?: ChatSessionsQueryParams): Promise<ChatSessionListResponse> => {
    const { data } = await apiClient.get<ChatSessionListResponse>(ENDPOINTS.CHAT.SESSIONS, {
      params,
    });
    return data;
  },

  getMessages: async (
    sessionUuid: string,
    params?: { limit?: number; before_seq?: number },
  ): Promise<ChatMessagesResponse> => {
    const { data } = await apiClient.get<ChatMessagesResponse>(
      ENDPOINTS.CHAT.MESSAGES(sessionUuid),
      { params },
    );
    return data;
  },

  assign: async (sessionUuid: string, agentId: number) => {
    const { data } = await apiClient.post(ENDPOINTS.CHAT.ASSIGN(sessionUuid), null, {
      params: { agent_id: agentId },
    });
    return data;
  },

  resolve: async (sessionUuid: string) => {
    const { data } = await apiClient.post(ENDPOINTS.CHAT.RESOLVE(sessionUuid));
    return data;
  },

  escalate: async (sessionUuid: string) => {
    const { data } = await apiClient.post(ENDPOINTS.CHAT.ESCALATE(sessionUuid));
    return data;
  },

  listQuickReplies: async (): Promise<ChatQuickRepliesResponse> => {
    const { data } = await apiClient.get<ChatQuickRepliesResponse>(
      ENDPOINTS.CHAT.QUICK_REPLIES,
    );
    return data;
  },
};
