import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  CreateTicketRequest,
  ReplyTicketRequest,
  SupportMessage,
  SupportTicket,
  SupportTicketListResponse,
  UpdateTicketStatusRequest,
} from '@/types/support';

export const supportService = {
  list: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SupportTicketListResponse> => {
    const { data } = await apiClient.get<SupportTicketListResponse>(
      ENDPOINTS.SUPPORT.TICKETS,
      { params },
    );
    return data;
  },

  getById: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.get<SupportTicket>(
      ENDPOINTS.SUPPORT.TICKET_DETAIL(ticketId),
    );
    return data;
  },

  create: async (payload: CreateTicketRequest): Promise<SupportTicket> => {
    const { data } = await apiClient.post<SupportTicket>(ENDPOINTS.SUPPORT.TICKETS, payload);
    return data;
  },

  reply: async (ticketId: string, payload: ReplyTicketRequest): Promise<SupportMessage> => {
    const { data } = await apiClient.post<SupportMessage>(
      ENDPOINTS.SUPPORT.TICKET_MESSAGES(ticketId),
      payload,
    );
    return data;
  },

  updateStatus: async (
    ticketId: string,
    payload: UpdateTicketStatusRequest,
  ): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(
      ENDPOINTS.SUPPORT.TICKET_STATUS(ticketId),
      payload,
    );
    return data;
  },
};
