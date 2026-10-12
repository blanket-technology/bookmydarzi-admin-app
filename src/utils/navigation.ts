import { router } from 'expo-router';

/** router.back() silently no-ops when the current screen's nested Stack has
 * no history to pop (e.g. reached via a push notification, a broadcast-accept
 * router.push, or any other deep link straight into a detail screen instead
 * of via its section's own index) - the user is then stuck with a back
 * button/gesture that does nothing. Falls back to a known-safe destination
 * (that section's index) when there's nothing to pop. */
export function safeGoBack(fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref as never);
  }
}
