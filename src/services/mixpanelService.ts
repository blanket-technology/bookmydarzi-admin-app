import { Mixpanel } from "mixpanel-react-native";

// Optional, not a hard dependency - same pattern as sentryService.ts's DSN:
// if EXPO_PUBLIC_MIXPANEL_TOKEN isn't set, every call here is a silent
// no-op rather than the app breaking on a missing config value.
const TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

let mixpanel: Mixpanel | null = null;
let initPromise: Promise<void> | null = null;

export function initMixpanel(): void {
  if (!TOKEN || initPromise) return;
  initPromise = Mixpanel.init(TOKEN, /* trackAutomaticEvents */ false)
    .then((instance) => {
      mixpanel = instance;
    })
    .catch(() => {
      mixpanel = null;
    });
}

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (!mixpanel) return;
  try {
    mixpanel.track(eventName, properties);
  } catch {
    // Analytics must never disrupt the calling flow (broadcast accept,
    // application submit, etc.).
  }
}

// ---------------------------------------------------------------------------
// This batch's tailor-side events - broadcast accept/decline rate and
// application submission, tied to the tailor-reliability funnel this round
// of work shipped.
// ---------------------------------------------------------------------------

export function trackBroadcastAccepted(properties: { order_id?: number | string }): void {
  track("broadcast_accepted", properties);
}

export function trackBroadcastDeclined(properties: { order_id?: number | string }): void {
  track("broadcast_declined", properties);
}

export function trackTailorApplicationSubmitted(properties: { application_id?: number }): void {
  track("tailor_application_submitted", properties);
}
