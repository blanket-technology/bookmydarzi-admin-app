import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { supportService } from '@/services/supportService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type {
  CreateTicketRequest,
  ReplyTicketRequest,
  UpdateTicketStatusRequest,
} from '@/types/support';

export const useSupportTickets = (
  params?: { status?: string; search?: string; page?: number; limit?: number },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.SUPPORT_TICKETS(params as Record<string, unknown>),
    queryFn: () => supportService.list(params),
    enabled,
  });

export const useSupportTicket = (ticketId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.SUPPORT_TICKET(ticketId),
    queryFn: () => supportService.getById(ticketId),
    enabled: enabled && !!ticketId,
  });

export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketRequest) => supportService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support ticket raised');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useReplyTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: ReplyTicketRequest }) =>
      supportService.reply(ticketId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPORT_TICKET(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateTicketStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: UpdateTicketStatusRequest;
    }) => supportService.updateStatus(ticketId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPORT_TICKET(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket status updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
