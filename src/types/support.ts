// Mirrors app/schemas/support.py — a generic, role-agnostic support ticket
// system (customer/tailor raises a ticket, optionally tied to an order;
// staff sees everything and replies). Distinct from chat_v2 (customer-only
// live chat with AI/support agents) — this is the channel tailors use,
// since chat_v2 explicitly excludes them.
export const TICKET_CATEGORIES = ['order', 'payment', 'delivery', 'account', 'general'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface SupportMessage {
  id: string;
  sender_id: string;
  sender_role: 'user' | 'tailor' | 'staff' | string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_code?: string | null;
  user_id: string;
  order_id?: string | null;
  subject: string;
  category: TicketCategory | string;
  status: TicketStatus | string;
  priority: string;
  created_at: string;
  updated_at?: string | null;
  messages: SupportMessage[];
}

export interface SupportTicketListItem {
  id: string;
  ticket_code?: string | null;
  subject: string;
  category: TicketCategory | string;
  status: TicketStatus | string;
  order_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SupportTicketListResponse {
  tickets: SupportTicketListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTicketRequest {
  subject: string;
  message: string;
  category: TicketCategory | string;
  order_id?: string;
}

export interface ReplyTicketRequest {
  message: string;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus | string;
}
