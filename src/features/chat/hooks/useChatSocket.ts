import { useCallback, useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage, ChatWsIncomingFrame, ChatWsOutgoingFrame, LocalChatMessage } from '@/types/chat';

// There is no REST endpoint to send a chat message — sending is WebSocket-only
// (see app/api/v1/endpoints/chat_ws.py _handle_send_message). This hook owns
// one connection per open thread screen. Reconnect uses exponential backoff
// (matching react_app's useChatWS.ts, the customer app's proven pattern) so a
// server restart/network blip doesn't hammer the endpoint with retries every
// 3s indefinitely - it backs off up to 30s, and resets to 1s once a
// connection actually succeeds.
const RECONNECT_DELAY_INITIAL_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 25000;
// How long to wait for the backend to echo a sent message back (as a
// message_created frame carrying the same client_id) before marking it
// failed - mirrors react_app's useChatWS.ts SEND_ACK_TIMEOUT_MS. Generous
// enough for normal latency, short enough that a genuinely lost message
// doesn't sit "Sending..." forever.
const SEND_ACK_TIMEOUT_MS = 10000;

function wsUrl(sessionUuid: string): string {
  const httpBase = API_CONFIG.BASE_URL;
  const wsBase = httpBase.replace(/^http/, 'ws');
  // Token is sent in a post-connect auth frame, not the URL (keeps it out of logs).
  return `${wsBase}${ENDPOINTS.CHAT.WS(sessionUuid)}`;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  peerTyping: boolean;
  /** This hook now owns the message list (previously the caller screen held
   * its own localMessages state and merged in incoming frames itself) - that
   * ownership move is what lets sendMessage mark a message "pending"
   * immediately and auto-resend it on reconnect, matching react_app's
   * useChatWS.ts/useSupportChatStore.ts design. Seed it once via
   * setInitialMessages when the REST history load completes. */
  messages: LocalChatMessage[];
  setInitialMessages: (messages: ChatMessage[]) => void;
  /** Always marks the message pending immediately, even if the socket is
   * closed right now - the caller's optimistic bubble stays visible with a
   * pending/failed indicator instead of vanishing, and the ack timeout (or a
   * later reconnect's auto-resend) resolves it either way. Returns the
   * client_id so the caller can key its optimistic list item. */
  sendMessage: (body: string, attachmentUrl?: string) => string;
  /** Explicit user-triggered retry for a failed message (e.g. a "Retry" tap) -
   * same underlying dispatch as the automatic reconnect resend. */
  retryMessage: (clientId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReadReceipt: (lastSeq: number) => void;
}

export interface ChatSocketSessionEvent {
  type: 'status_changed' | 'assigned' | 'resolved';
  status?: string;
  agentName?: string;
}

export function useChatSocket(
  sessionUuid: string,
  onSessionEvent?: (event: ChatSocketSessionEvent) => void,
): UseChatSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_INITIAL_MS);
  const mountedRef = useRef(true);
  const onSessionEventRef = useRef(onSessionEvent);
  onSessionEventRef.current = onSessionEvent;
  // client_id -> ack timer, so a late/duplicate ack or a resend can clear
  // the right timer without racing a stale one from a previous attempt.
  const pendingAcksRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearAckTimer = useCallback((clientId: string) => {
    const timer = pendingAcksRef.current.get(clientId);
    if (timer) {
      clearTimeout(timer);
      pendingAcksRef.current.delete(clientId);
    }
  }, []);

  const markMessageStatus = useCallback((clientId: string, status: 'pending' | 'sent' | 'failed') => {
    setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, deliveryStatus: status } : m)));
  }, []);

  const setInitialMessages = useCallback((initial: ChatMessage[]) => {
    setMessages(initial);
  }, []);

  const send = useCallback((frame: ChatWsOutgoingFrame): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(frame));
      return true;
    }
    return false;
  }, []);

  // Sends over the current socket if open, tracking pending/failed status on
  // the message either way - shared by the public sendMessage/retryMessage
  // and the auto-resend-on-reconnect path below.
  const dispatchSend = useCallback(
    (clientId: string, body: string, messageType: string, attachmentId?: string) => {
      clearAckTimer(clientId);
      markMessageStatus(clientId, 'pending');

      send({
        event: 'send_message',
        body,
        client_id: clientId,
        ...(attachmentId ? { message_type: 'image', attachment_id: attachmentId } : {}),
      } as ChatWsOutgoingFrame);

      // Always arm the ack timer, even when the socket isn't open right now -
      // a message must never sit "pending" forever. If the socket is closed,
      // this is what turns it into "failed" (with a Retry affordance) after
      // SEND_ACK_TIMEOUT_MS instead of relying purely on a future reconnect
      // that may not happen soon, or at all.
      const timer = setTimeout(() => {
        pendingAcksRef.current.delete(clientId);
        markMessageStatus(clientId, 'failed');
      }, SEND_ACK_TIMEOUT_MS);
      pendingAcksRef.current.set(clientId, timer);
    },
    [clearAckTimer, markMessageStatus, send],
  );

  useEffect(() => {
    if (!sessionUuid) return undefined;
    mountedRef.current = true;

    const connect = () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      const socket = new WebSocket(wsUrl(sessionUuid));
      wsRef.current = socket;

      socket.onopen = () => {
        try { socket.send(JSON.stringify({ type: 'auth', token })); } catch {}
        reconnectDelayRef.current = RECONNECT_DELAY_INITIAL_MS;
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
          if (wsRef.current === socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ event: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL_MS);
        if (mountedRef.current) setIsConnected(true);

        // Auto-resend anything that never got acked before the connection
        // dropped (queued while offline, or in flight when the socket died).
        for (const m of messages) {
          if ((m.deliveryStatus === 'pending' || m.deliveryStatus === 'failed') && m.client_id) {
            dispatchSend(
              m.client_id,
              m.body ?? '',
              m.message_type,
              m.metadata?.attachment_id as string | undefined,
            );
          }
        }
      };

      socket.onmessage = (event) => {
        let frame: ChatWsIncomingFrame;
        try {
          frame = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (frame.event === 'message_created') {
          const msg = frame.message;
          if (msg.client_id) clearAckTimer(msg.client_id);
          setMessages((prev) => {
            const exists = prev.some(
              (m) => m.id === msg.id || (msg.client_id && m.client_id === msg.client_id),
            );
            if (exists) {
              return prev.map((m) =>
                m.client_id && m.client_id === msg.client_id
                  ? { ...m, ...msg, deliveryStatus: 'sent' as const }
                  : m,
              );
            }
            return [...prev, msg];
          });
        } else if (frame.event === 'send_failed' || frame.event === 'rate_limited') {
          const clientId = 'client_id' in frame ? frame.client_id : null;
          if (clientId) {
            clearAckTimer(clientId);
            markMessageStatus(clientId, 'failed');
          }
        } else if (frame.event === 'typing_indicator') {
          setPeerTyping(frame.is_typing);
        } else if (frame.event === 'session_status_changed') {
          onSessionEventRef.current?.({ type: 'status_changed', status: frame.status });
        } else if (frame.event === 'session_assigned') {
          onSessionEventRef.current?.({ type: 'assigned', agentName: frame.agent_name });
        } else if (frame.event === 'session_resolved') {
          onSessionEventRef.current?.({ type: 'resolved' });
        }
      };

      socket.onclose = () => {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        if (!mountedRef.current) return;
        setIsConnected(false);
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_DELAY_MAX_MS);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      pendingAcksRef.current.forEach((timer) => clearTimeout(timer));
      pendingAcksRef.current.clear();
      wsRef.current?.close();
      wsRef.current = null;
    };
    // messages is intentionally omitted - it's read only inside onopen's
    // resend loop via closure, and including it would reconnect the socket
    // on every new message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUuid, clearAckTimer, dispatchSend, markMessageStatus]);

  const sendMessage = useCallback(
    (body: string, attachmentUrl?: string): string => {
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: LocalChatMessage = {
        id: -1,
        session_uuid: sessionUuid,
        seq: -1,
        sender_type: 'agent',
        sender_id: null,
        body,
        message_type: attachmentUrl ? 'image' : 'text',
        client_id: clientId,
        metadata: attachmentUrl ? { attachment_id: attachmentUrl } : null,
        created_at: new Date().toISOString(),
        deliveryStatus: 'pending',
      };
      setMessages((prev) => [...prev, optimistic]);
      dispatchSend(clientId, body, optimistic.message_type, attachmentUrl);
      return clientId;
    },
    [dispatchSend, sessionUuid],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      const msg = messages.find((m) => m.client_id === clientId);
      if (!msg) return;
      dispatchSend(clientId, msg.body ?? '', msg.message_type, msg.metadata?.attachment_id as string | undefined);
    },
    [dispatchSend, messages],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      send({ event: isTyping ? 'typing_start' : 'typing_stop' });
    },
    [send],
  );

  const sendReadReceipt = useCallback(
    (lastSeq: number) => {
      send({ event: 'read_receipt', last_read_seq: lastSeq });
    },
    [send],
  );

  return {
    isConnected,
    peerTyping,
    messages,
    setInitialMessages,
    sendMessage,
    retryMessage,
    sendTyping,
    sendReadReceipt,
  };
}
