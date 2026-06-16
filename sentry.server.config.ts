// Server-side Sentry init. Imported by instrumentation.ts when SENTRY_DSN
// is set and the runtime is Node.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  // Don't send PII; this app's audit log already records actor identity
  // server-side with explicit consent semantics.
  sendDefaultPii: false,
  // Drop noisy framework errors that aren't actionable.
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
