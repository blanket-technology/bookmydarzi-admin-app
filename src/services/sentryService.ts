import * as Sentry from "@sentry/react-native";

// Optional, not a hard dependency - if EXPO_PUBLIC_SENTRY_DSN isn't set (e.g.
// a fresh clone before the DSN is provisioned), the app must keep working
// exactly as before rather than crashing on a missing config value.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized || !DSN) return;
  initialized = true;

  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0,
    enableAutoSessionTracking: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? "production",
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
