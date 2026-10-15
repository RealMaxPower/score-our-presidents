// Browser error reporting (sentry.client.config.ts). NEXT_PUBLIC_SENTRY_DSN
// is inlined at build time, so while it is unset this branch is dead code:
// visitors never download the Sentry SDK and nothing is reported.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import("./sentry.client.config").catch(() => {
    // Error reporting must never break the page.
  });
}
