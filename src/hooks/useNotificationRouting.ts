import { router } from 'expo-router';
import { useEffect } from 'react';
import { isExpoGo } from '@/utils/expoGo';

// Maps the `action` the backend already sends in every broadcast push's
// data payload (e.g. "accept_pickup_broadcast" - see
// pickup_broadcast_service.py's _notify_employees) to the drawer screen
// that actually shows that broadcast, so tapping a backgrounded/killed-app
// notification routes straight there instead of just opening the app to
// its default/last screen. Previously nothing in the app listened for a
// tapped notification response at all - the backend's data.action/order_id
// were sent and silently unused.
const ROUTE_BY_ACTION: Record<string, string> = {
  accept_broadcast: '/(drawer)/broadcasts',
  accept_pickup_broadcast: '/(drawer)/pickups',
  accept_delivery_broadcast: '/(drawer)/deliveries',
  accept_return_broadcast: '/(drawer)/returns',
  accept_repair_pickup_broadcast: '/(drawer)/repair-pickups',
  accept_repair_delivery_broadcast: '/(drawer)/repair-deliveries',
};

function routeForNotificationData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const action = typeof data.action === 'string' ? data.action : undefined;
  if (action && ROUTE_BY_ACTION[action]) return ROUTE_BY_ACTION[action];
  // Falls back to the order detail screen for any other notification type
  // that carries an order_id but isn't a broadcast action (e.g. a status
  // update) - still better than doing nothing with a tap.
  // A chat push carries the conversation id (session_uuid) - open the thread,
  // not the (possibly unrelated) order the chat was started from.
  const chatSession = data.session_uuid ?? data.session_id;
  if (chatSession != null && (data.type === 'chat' || data.deep_link === 'support_conversation')) {
    return `/(drawer)/support/chat/${chatSession}`;
  }
  const orderId = data.order_id;
  if (orderId != null) return `/(drawer)/orders/${orderId}`;
  return null;
}

/**
 * Wires up tap-to-navigate for both backgrounded and killed-app launches:
 * - addNotificationResponseReceivedListener covers a tap while the app is
 *   already running in the background.
 * - getLastNotificationResponseAsync covers the app being launched fresh
 *   (killed state) by a notification tap - that case fires no listener
 *   event, since nothing was mounted yet to receive it.
 * Call once near the app root, after the user is authenticated (routing
 * into a drawer screen before auth/hydration is ready would be a no-op or
 * crash depending on navigator state).
 */
// Module-level, not per-mount: this hook remounts on every login, and the OS keeps
// returning the same last tapped notification - without this a stale tap from hours
// ago was replayed after each logout/login.
let lastHandledNotificationId: string | null = null;

export function useNotificationRouting(enabled: boolean): void {

  useEffect(() => {
    if (!enabled || isExpoGo) return undefined;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;

    import('expo-notifications')
      .then((Notifications) => {
        if (cancelled) return;

        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          lastHandledNotificationId = response.notification.request.identifier;
          const data = response.notification.request.content.data as Record<string, unknown> | undefined;
          const route = routeForNotificationData(data);
          if (route) router.push(route as never);
        });

        {
          Notifications.getLastNotificationResponseAsync().then((response) => {
            if (cancelled || !response) return;
            const id = response.notification.request.identifier;
            if (id === lastHandledNotificationId) return;
            lastHandledNotificationId = id;
            const data = response.notification.request.content.data as Record<string, unknown> | undefined;
            const route = routeForNotificationData(data);
            if (route) router.push(route as never);
          });
        }
      })
      .catch(() => {
        // Same best-effort posture as the rest of this app's
        // expo-notifications usage - a device that can't load the module
        // shouldn't block anything else.
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);
}
