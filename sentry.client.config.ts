// Client-side Sentry init. Loaded by @sentry/nextjs's auto-injected
// browser entry when NEXT_PUBLIC_SENTRY_DSN is set. We deliberately read
// from NEXT_PUBLIC_SENTRY_DSN (not SENTRY_DSN) so the secret never leaks
// into client bundles unless explicitly opted in.
//
// Set NEXT_PUBLIC_SENTRY_DSN = SENTRY_DSN in Vercel only if you want
// browser errors reported. For prod test, server-only is usually enough.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    // Session replay disabled — extra CSP surface (`worker-src 'self' blob:`,
    // `media-src`) and ongoing cost. Enable per-page later if needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}
