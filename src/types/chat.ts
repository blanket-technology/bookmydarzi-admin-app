// Mirrors backend app/api/v1/endpoints/chat_v2.py _session_dict /
// message_to_dict — no customer/tailor display-name denormalization exists
// on either shape (same pattern as orders/users), only *_id fields.
export type ChatSessionStatus =
  | 'open'
  | 'ai_handling'
  | 'pending_human'
  | 'assigned'
  | 'resolved'
  | 'closed';

export interface ChatSession {
  uuid: string;
  user_id: number;
  order_id: number | null;
  status: ChatSessionStatus;
  assigned_agent_id: number | null;
  ai_handled: boolean;
  last_message_at: string | null;
  created_at: string | null;
}

export interface ChatSessionListResponse {
  sessions: ChatSession[];
  count: number;
}

export type ChatMessageSenderType = 'customer' | 'agent' | 'ai' | 'system';

export interface ChatMessage {
  id: number;
  session_uuid: string;
  seq: number;
  sender_type: ChatMessageSenderType;
  sender_id: number | null;
  body: string;
  message_type: string;
  client_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ChatMessagesResponse {
  session_uuid: string;
  messages: ChatMessage[];
  count: number;
}

export interface ChatQuickReply {
  id: number;
  title: string;
  body: string;
  category: string;
  use_count: number;
}

export interface ChatQuickRepliesResponse {
  quick_replies: ChatQuickReply[];
}

export interface ChatSessionsQueryParams {
  status?: string;
  agent_id?: number;
  limit?: number;
  offset?: number;
}

// WebSocket frame contract — app/api/v1/endpoints/chat_ws.py.
export type ChatWsOutgoingFrame =
  | { event: 'send_message'; body: string; client_id: string; message_type?: string }
  | { event: 'typing_start' }
  | { event: 'typing_stop' }
  | { event: 'read_receipt'; last_read_seq: number }
  | { event: 'ping'; ts?: number };

export type ChatWsIncomingFrame =
  | { event: 'message_created'; message: ChatMessage }
  | { event: 'send_failed'; client_id: string | null; message: string }
  | { event: 'rate_limited'; message: string }
  | { event: 'typing_indicator'; user_id: number; is_typing: boolean }
  | { event: 'read_receipt_updated'; user_id: number; last_read_seq: number }
  | { event: 'session_resolved'; resolved_by: string; csat_prompt: boolean }
  | { event: 'pong'; ts?: number };
