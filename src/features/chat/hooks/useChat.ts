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

export const useChatSession = (sessionUuid: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_SESSION(sessionUuid),
    queryFn: () => chatService.getSession(sessionUuid),
    enabled: enabled && !!sessionUuid,
  });

export const useQuickReplies = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_QUICK_REPLIES,
    queryFn: () => chatService.listQuickReplies(),
    enabled,
  });

export const useAssignmentHistory = (sessionUuid: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CHAT_ASSIGNMENT_HISTORY(sessionUuid),
    queryFn: () => chatService.getAssignmentHistory(sessionUuid),
    enabled: enabled && !!sessionUuid,
  });

export const useAssignSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionUuid, agentId }: { sessionUuid: string; agentId: number }) =>
      chatService.assign(sessionUuid, agentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CHAT_ASSIGNMENT_HISTORY(variables.sessionUuid),
      });
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

// Backs the online/offline toggle - "online" is what makes this agent
// eligible for get_and_assign_available_agent(), i.e. what actually lets
// them receive escalated chats instead of those chats queuing forever.
export const useMyAgentStatus = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_AGENT_STATUS,
    queryFn: () => chatService.getMyAgentStatus(),
    enabled,
  });

export const useSetAgentStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, status }: { agentId: number; status: 'online' | 'offline' }) =>
      chatService.setAgentStatus(agentId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_AGENT_STATUS });
      if (variables.status === 'online') {
        // Going online may have just unblocked queued customers - refresh
        // the list so this agent sees them right away.
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      }
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
