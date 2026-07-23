import { useCallback, useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage, ChatWsIncomingFrame, ChatWsOutgoingFrame } from '@/types/chat';

// There is no REST endpoint to send a chat message — sending is WebSocket-only
// (see app/api/v1/endpoints/chat_ws.py _handle_send_message). This hook owns
// one connection per open thread screen; it reconnects once on an
// unexpected close but does not attempt sophisticated backoff — matching the
// MVP scope agreed for this feature (view/send/assign/resolve/escalate only).
const RECONNECT_DELAY_MS = 3000;

function wsUrl(sessionUuid: string, token: string): string {
  const httpBase = API_CONFIG.BASE_URL;
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}${ENDPOINTS.CHAT.WS(sessionUuid)}?token=${encodeURIComponent(token)}`;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  peerTyping: boolean;
  sendMessage: (body: string) => string;
  sendTyping: (isTyping: boolean) => void;
  sendReadReceipt: (lastSeq: number) => void;
}

export function useChatSocket(
  sessionUuid: string,
  onMessage: (message: ChatMessage) => void,
  onSendFailed?: (clientId: string | null, message: string) => void,
): UseChatSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onSendFailedRef = useRef(onSendFailed);
  onMessageRef.current = onMessage;
  onSendFailedRef.current = onSendFailed;

  const send = useCallback((frame: ChatWsOutgoingFrame) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(frame));
    }
  }, []);

  useEffect(() => {
    if (!sessionUuid) return undefined;
    mountedRef.current = true;

    const connect = () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      const socket = new WebSocket(wsUrl(sessionUuid, token));
      wsRef.current = socket;

      socket.onopen = () => {
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
        }
      };

      socket.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionUuid]);

  const sendMessage = useCallback(
    (body: string): string => {
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      send({ event: 'send_message', body, client_id: clientId });
      return clientId;
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
