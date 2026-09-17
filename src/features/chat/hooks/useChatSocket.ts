import { useCallback, useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage, ChatWsIncomingFrame, ChatWsOutgoingFrame } from '@/types/chat';

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

function wsUrl(sessionUuid: string): string {
  const httpBase = API_CONFIG.BASE_URL;
  const wsBase = httpBase.replace(/^http/, 'ws');
  // Token is sent in a post-connect auth frame, not the URL (keeps it out of logs).
  return `${wsBase}${ENDPOINTS.CHAT.WS(sessionUuid)}`;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  peerTyping: boolean;
  /** Returns the generated client_id if the frame was actually sent over an
   * open socket, or null if the socket wasn't connected (nothing was sent -
   * callers must not treat this as delivered, e.g. must not clear a draft).
   * Pass attachmentUrl (the ImageKit url from useUploadChatAttachmentMutation)
   * to send an image message - body may be empty in that case, matching the
   * backend's own "body OR attachment_id" requirement (chat_ws.py). */
  sendMessage: (body: string, attachmentUrl?: string) => string | null;
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
  onMessage: (message: ChatMessage) => void,
  onSendFailed?: (clientId: string | null, message: string) => void,
  onSessionEvent?: (event: ChatSocketSessionEvent) => void,
): UseChatSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_INITIAL_MS);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onSendFailedRef = useRef(onSendFailed);
  const onSessionEventRef = useRef(onSessionEvent);
  onMessageRef.current = onMessage;
  onSendFailedRef.current = onSendFailed;
  onSessionEventRef.current = onSessionEvent;

  const send = useCallback((frame: ChatWsOutgoingFrame): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(frame));
      return true;
    }
    return false;
  }, []);

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
      };

      socket.onmessage = (event) => {
        let frame: ChatWsIncomingFrame;
        try {
          frame = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (frame.event === 'message_created') {
          onMessageRef.current(frame.message);
        } else if (frame.event === 'send_failed' || frame.event === 'rate_limited') {
          onSendFailedRef.current?.(
            'client_id' in frame ? frame.client_id : null,
            frame.message,
          );
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
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionUuid]);

  const sendMessage = useCallback(
    (body: string, attachmentUrl?: string): string | null => {
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sent = send({
        event: 'send_message',
        body,
        client_id: clientId,
        ...(attachmentUrl ? { message_type: 'image', attachment_id: attachmentUrl } : {}),
      });
      return sent ? clientId : null;
    },
    [send],
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

  return { isConnected, peerTyping, sendMessage, sendTyping, sendReadReceipt };
}
