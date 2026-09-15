import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { incomingBroadcastQueue } from '@/store/incomingBroadcastStore';
import { incomingOfferQueue, type IncomingOfferLocation } from '@/store/incomingOfferStore';
import { toast } from '@/store/toastStore';
import { wsStatus } from '@/store/wsStatusStore';
import type { NotificationItem, NotificationListResponse } from '@/types/notifications';

// App-wide persistent WebSocket, distinct from useChatSocket (one socket per
// open chat thread). This is the one connection that stays alive for the
// whole authenticated session so NOTIFICATION events (and any future
// app-wide push type) arrive instantly instead of waiting for the next 30s
// poll - see app/api/v1/endpoints/ws.py, which joins every authenticated
// connection to its own "user:{id}" room automatically.
const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30_000;

function wsUrl(): string {
  const httpBase = API_CONFIG.BASE_URL;
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}${ENDPOINTS.WS}`;
}

interface NotificationFrame {
  event: 'NOTIFICATION';
  data: NotificationItem;
}

export function useAppSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const shouldConnectRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    shouldConnectRef.current = isAuthenticated;
    if (!isAuthenticated) wsStatus.setConnecting();

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!shouldConnectRef.current || !mountedRef.current) return;
      clearReconnectTimer();
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const handleNotification = (notification: NotificationItem) => {
      // Push the new row straight into the list cache (page 1, unfiltered)
      // and bump the unread badge - avoids waiting for the next poll/refetch
      // to reflect what the socket already told us just happened.
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: ['notifications'] },
        (prev) => {
          // ['notifications'] prefix-matches BOTH the list query
          // (QUERY_KEYS.NOTIFICATIONS, shaped NotificationListResponse) and
          // the separate unread-count query (QUERY_KEYS.NOTIFICATIONS_
          // UNREAD_COUNT = ['notifications', 'unread-count'], shaped as a
          // plain number). Without this shape guard, this updater ran
          // against the unread-count cache too - `prev` was a truthy
          // number, so it passed the `!prev` check, then `prev.notifications`
          // was undefined on a number and `.some()` threw
          // "Cannot read property 'some' of undefined".
          if (!prev || !Array.isArray(prev.notifications)) return prev;
          if (prev.notifications.some((n) => n.id === notification.id)) return prev;
          return {
            ...prev,
            notifications: [notification, ...prev.notifications],
            total: prev.total + 1,
            unread_count: prev.unread_count + (notification.is_read ? 0 : 1),
          };
        },
      );
      queryClient.setQueryData<number>(QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT, (prev) =>
        (prev ?? 0) + 1,
      );
      // Also invalidate so a screen that isn't holding page-1 cache (e.g.
      // filtered/paginated views) still picks up the new unread count on
      // its next mount/refetch, without forcing an immediate network call.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT, refetchType: 'none' });

      if (notification.priority === 'high' || notification.priority === 'critical') {
        toast.info(`${notification.title}${notification.body ? ` — ${notification.body}` : ''}`);
      }

      // Pickup/delivery/return broadcast offers also need their own screens'
      // data refreshed instantly, not just the notification feed -
      // OfferAlerts.tsx/IncomingOfferModal.tsx react to these query caches
      // changing, so invalidating here removes the previous 30s-poll lag
      // with no change needed on that side.
      if (notification.type === 'pickup_broadcast_offer') {
        queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
      } else if (notification.type === 'delivery_broadcast_offer') {
        queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
      } else if (notification.type === 'return_broadcast_offer') {
        // Was previously missing entirely - the Returns screen only ever
        // updated via its own 30s poll, unlike pickup/delivery above.
        queryClient.invalidateQueries({ queryKey: ['return-broadcasts'] });
      } else if (notification.type === 'broadcast_offer') {
        queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      }

      // Feed the full-screen incoming-offer popup (IncomingOfferModal.tsx) -
      // delivery/return notifications already carry the full pickup/drop
      // location payload in `data` (see delivery_broadcast_service.py /
      // return_broadcast_service.py's notify_users calls), so the popup can
      // render instantly with zero refetch latency. Pickup offers only carry
      // order_id/order_code (single-location by design - the "pickup" point
      // IS the customer's own address) - the modal resolves that itself from
      // the now-invalidated pickup-broadcasts list above.
      if (
        notification.type === 'pickup_broadcast_offer' ||
        notification.type === 'delivery_broadcast_offer' ||
        notification.type === 'return_broadcast_offer'
      ) {
        const kind =
          notification.type === 'pickup_broadcast_offer'
            ? 'pickup'
            : notification.type === 'delivery_broadcast_offer'
              ? 'delivery'
              : 'return';
        const data = notification.data ?? {};
        // The WS notification payload doesn't carry the broadcast row's real
        // expires_at (see delivery/pickup/return_broadcast_service.py's
        // notify_users calls - order_id/order_code/pickup/drop only), but
        // every broadcast round is a fixed 5-minute window
        // (ROUND_TIMEOUT_MINUTES) - approximating "now + 5 min" here gets
        // the popup's countdown started immediately rather than waiting on
        // a fetch; it's superseded by the real value once the pickup-offer
        // lookup (for kind='pickup') or a manual refresh resolves it.
        const approxExpiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
        incomingOfferQueue.enqueue({
          kind,
          orderId: String(data.order_id ?? ''),
          orderCode: (data.order_code as string | null | undefined) ?? null,
          pickup: (data.pickup as IncomingOfferLocation | null | undefined) ?? null,
          drop: (data.drop as IncomingOfferLocation | null | undefined) ?? null,
          expiresAt: approxExpiresAt,
          broadcastRound: null,
        });
      }

      // Feed the tailor's full-screen incoming-broadcast popup
      // (IncomingBroadcastModal.tsx). The WS payload carries almost nothing
      // (order_id/order_code only - see broadcast_service.py's
      // _notify_tailors), so the modal always resolves the real card from
      // the now-invalidated ['broadcasts'] query above rather than from this
      // payload.
      if (notification.type === 'broadcast_offer') {
        const data = notification.data ?? {};
        incomingBroadcastQueue.enqueue({
          orderId: String(data.order_id ?? ''),
          orderCode: (data.order_code as string | null | undefined) ?? null,
        });
      }

      // Every order-lifecycle event (tailor assigned, status changed, pickup
      // confirmed, etc.) is sent as the generic "order_update" type - see
      // app/services/notifications/policy.py, which has no dedicated type
      // per event. Without this, a tailor who gets manually assigned an
      // order (Admin_Web's "Assign" button, not the broadcast flow) never
      // sees it appear: the Orders list query has a 60s staleTime and
      // refetchOnWindowFocus is off (AppProviders.tsx), so nothing ever
      // told the cache it was stale until a manual pull-to-refresh.
      if (notification.type === 'order_update') {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        if (notification.data?.order_id) {
          queryClient.invalidateQueries({ queryKey: ['order', String(notification.data.order_id)] });
        }
      }

      // Admin/Superadmin live-ops visibility: the dashboard's stat cards
      // (active orders, broadcasts in progress, etc.) previously never
      // reacted to ANY of these events - only the 20s poll fallback
      // (useDashboard.ts) kept them from going stale forever. Any
      // order-lifecycle or broadcast-offer event is a real signal the
      // dashboard's counts may have changed, so it's invalidated here too.
      if (
        notification.type === 'order_update' ||
        notification.type === 'pickup_broadcast_offer' ||
        notification.type === 'delivery_broadcast_offer' ||
        notification.type === 'broadcast_offer'
      ) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD, refetchType: 'none' });
      }
    };

    const connect = () => {
      if (!shouldConnectRef.current) return;
      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      wsStatus.setConnecting();
      const socket = new WebSocket(wsUrl());
      wsRef.current = socket;

      socket.onopen = () => {
        try {
          socket.send(JSON.stringify({ type: 'auth', token }));
        } catch {
          // socket will surface the failure via onerror/onclose
        }
        reconnectAttemptRef.current = 0;
        wsStatus.setConnected();
      };

      socket.onmessage = (event) => {
        let frame: NotificationFrame;
        try {
          frame = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (frame.event === 'NOTIFICATION' && frame.data) {
          handleNotification(frame.data);
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) wsRef.current = null;
        if (shouldConnectRef.current) wsStatus.setDisconnected();
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    if (shouldConnectRef.current) connect();

    // Reconnect immediately on foreground - a socket silently dies while the
    // app is backgrounded on both iOS and Android, so returning to the app
    // is the one moment we know for certain the connection needs a fresh check.
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && shouldConnectRef.current && !wsRef.current) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    });

    return () => {
      mountedRef.current = false;
      shouldConnectRef.current = false;
      clearReconnectTimer();
      appStateSub.remove();
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
