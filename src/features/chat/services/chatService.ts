import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AgentPresenceStatus,
  ChatAnalytics,
  ChatAssignmentHistoryResponse,
  ChatMessagesResponse,
  ChatQuickRepliesResponse,
  ChatSession,
  ChatSessionListResponse,
  ChatSessionsQueryParams,
  MyAgentStatus,
} from '@/types/chat';

export const chatService = {
  listSessions: async (params?: ChatSessionsQueryParams): Promise<ChatSessionListResponse> => {
    const { data } = await apiClient.get<ChatSessionListResponse>(ENDPOINTS.CHAT.SESSIONS, {
      params,
    });
    return data;
  },

  getSession: async (sessionUuid: string): Promise<ChatSession> => {
    const { data } = await apiClient.get<ChatSession>(ENDPOINTS.CHAT.SESSION_DETAIL(sessionUuid));
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

  getAssignmentHistory: async (sessionUuid: string): Promise<ChatAssignmentHistoryResponse> => {
    const { data } = await apiClient.get<ChatAssignmentHistoryResponse>(
      ENDPOINTS.CHAT.ASSIGNMENT_HISTORY(sessionUuid),
    );
    return data;
  },

  listQuickReplies: async (): Promise<ChatQuickRepliesResponse> => {
    const { data } = await apiClient.get<ChatQuickRepliesResponse>(
      ENDPOINTS.CHAT.QUICK_REPLIES,
    );
    return data;
  },

  getMyAgentStatus: async (): Promise<MyAgentStatus> => {
    const { data } = await apiClient.get<MyAgentStatus>(ENDPOINTS.CHAT.MY_AGENT_STATUS);
    return data;
  },

  setAgentStatus: async (agentId: number, status: AgentPresenceStatus) => {
    const { data } = await apiClient.patch(ENDPOINTS.CHAT.AGENT_STATUS(agentId), null, {
      params: { status },
    });
    return data;
  },

  getAnalytics: async (): Promise<ChatAnalytics> => {
    const { data } = await apiClient.get<ChatAnalytics>(ENDPOINTS.CHAT.ANALYTICS);
    return data;
  },

  // POST /chat/v2/upload — same multipart pattern as catalogService/
  // kycService. Returns the ImageKit url that must be sent as the WS
  // send_message frame's attachment_id (chat_ws.py stores that value
  // verbatim into metadata.attachment_id, which the message list then
  // renders directly as an Image uri - sending file_id instead would
  // produce a broken image).
  uploadAttachment: async (
    uri: string,
    fileName?: string,
    mimeType?: string,
  ): Promise<{ url: string; file_id: string; mime_type: string }> => {
    const form = new FormData();
    form.append('file', {
      uri,
      name: fileName ?? `chat-attachment-${Date.now()}.jpg`,
      type: mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ url: string; file_id: string; mime_type: string }>(
      ENDPOINTS.CHAT.UPLOAD,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
