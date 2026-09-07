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
  customer_name?: string | null;
  order_id: number | null;
  order_code?: string | null;
  status: ChatSessionStatus;
  assigned_agent_id: number | null;
  ai_handled: boolean;
  unread_count?: number | null;
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

export interface ChatAssignmentHistoryItem {
  id: number;
  agent_id: number | null;
  agent_name: string | null;
  assigned_by: number | null;
  assigned_by_name: string | null;
  reason: string;
  assigned_at: string | null;
}

export interface ChatAssignmentHistoryResponse {
  history: ChatAssignmentHistoryItem[];
}

// GET /admin/agents/me/status — backs the online/offline toggle. "online"
// is what makes get_and_assign_available_agent() consider this user for
// new/queued chats; anything else leaves them unassignable.
export type AgentPresenceStatus = 'online' | 'busy' | 'away' | 'offline';

export interface MyAgentStatus {
  agent_id: number;
  status: AgentPresenceStatus;
  active_session_count: number;
  max_sessions: number;
}

// GET /admin/chat/analytics - app/api/v1/endpoints/chat_v2.py's get_analytics.
// A compact 24h stat summary, not a time series - there is no per-agent
// workload or volume-over-time breakdown on the backend today.
export interface ChatAnalytics {
  period: string;
  total_sessions: number;
  ai_resolved: number;
  ai_resolve_rate: number;
  avg_csat: number | null;
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
  | { event: 'ai_typing' }
  | { event: 'read_receipt_updated'; user_id: number; last_read_seq: number }
  | { event: 'session_status_changed'; status: ChatSessionStatus }
  | { event: 'session_assigned'; agent_name: string }
  | { event: 'session_resolved'; resolved_by: string; csat_prompt: boolean }
  | { event: 'pong'; ts?: number };
