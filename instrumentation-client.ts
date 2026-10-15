// Browser error reporting (sentry.client.config.ts). While
// NEXT_PUBLIC_SENTRY_DSN is unset the import never runs: the SDK chunk is
// built but never downloaded, and nothing is reported.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import("./sentry.client.config").catch(() => {
    // Error reporting must never break the page.
  });
}
