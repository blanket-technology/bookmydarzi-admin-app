import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { chatService } from '@/features/chat/services/chatService';
import type { ChatSessionsQueryParams } from '@/types/chat';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// The backend has no separate unread-count endpoint for chat (unlike
// Notifications) — polling the session list is the source of truth for both
// the inbox screen and the drawer badge count.
const SESSIONS_POLL_MS = 20_000;

export const useChatSessions = (params?: ChatSessionsQueryParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_SESSIONS(params as Record<string, unknown>),
    queryFn: () => chatService.listSessions(params),
    enabled,
    refetchInterval: enabled ? SESSIONS_POLL_MS : false,
  });

// Sessions waiting on a human (unassigned or newly escalated) — used for the
// drawer badge, same "needs attention" spirit as the Employee dashboard's
// COD-pending count.
export const usePendingChatCount = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_SESSIONS({ status: 'pending_human' }),
    queryFn: () => chatService.listSessions({ status: 'pending_human', limit: 100 }),
    enabled,
    refetchInterval: enabled ? SESSIONS_POLL_MS : false,
    select: (data) => data.count,
  });

export const useChatMessages = (sessionUuid: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_MESSAGES(sessionUuid),
    queryFn: () => chatService.getMessages(sessionUuid, { limit: 100 }),
    enabled: enabled && !!sessionUuid,
  });

export const useQuickReplies = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_QUICK_REPLIES,
    queryFn: () => chatService.listQuickReplies(),
    enabled,
  });

export const useAssignSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionUuid, agentId }: { sessionUuid: string; agentId: number }) =>
      chatService.assign(sessionUuid, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      toast.success('Conversation assigned to you');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useResolveSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionUuid: string) => chatService.resolve(sessionUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      toast.success('Conversation resolved');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useEscalateSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionUuid: string) => chatService.escalate(sessionUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      toast.success('Conversation escalated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
