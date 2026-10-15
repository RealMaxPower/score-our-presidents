// Client-side Sentry init, loaded by instrumentation-client.ts only when
// NEXT_PUBLIC_SENTRY_DSN is set. We deliberately read NEXT_PUBLIC_SENTRY_DSN
// (not SENTRY_DSN) so browser reporting stays off unless explicitly opted in
// with Vercel env.
//
// Privacy (see app/privacy): no PII, no session replay, no tracing; reports
// carry the error, the page path without its query string, and the browser.

import * as Sentry from "@sentry/nextjs";

const stripQuery = (url: string) => url.split(/[?#]/)[0];

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
    beforeSend(event) {
      if (event.request) {
        if (event.request.url) event.request.url = stripQuery(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
        // Keep only the browser string; Referer can carry a full URL.
        const ua = event.request.headers?.["User-Agent"];
        event.request.headers = ua ? { "User-Agent": ua } : undefined;
      }
      return event;
    },
    beforeBreadcrumb(crumb) {
      // Console output can contain anything; don't ship it.
      if (crumb.category === "console") return null;
      for (const key of ["url", "from", "to"]) {
        const value = crumb.data?.[key];
        if (typeof value === "string") crumb.data![key] = stripQuery(value);
      }
      return crumb;
    },
  });
}
