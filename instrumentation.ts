// Next.js instrumentation hook. Runs once per server process (Node + Edge
// runtimes) before route handlers serve traffic. We use it to bootstrap
// Sentry when SENTRY_DSN is set; otherwise it's a no-op so dev and CI
// don't pay the cost.
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Required by @sentry/nextjs >= 8 to capture errors thrown in React Server
// Components. No-op when Sentry is unconfigured.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: "Pages Router" | "App Router"; routePath: string; routeType: "render" | "route" | "action" | "middleware" }
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
