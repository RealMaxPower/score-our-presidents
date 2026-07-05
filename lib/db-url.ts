// Pure connection-string helpers, kept free of `server-only` and any client
// construction so they stay unit-testable in a plain node environment.
//
// Vercel's Neon integration provisions the pooled URL (POSTGRES_PRISMA_URL /
// DATABASE_URL) but those vars are integration-managed — we can't hand-edit the
// query params in the dashboard. So we normalize them here, at client
// construction, to a coherent, self-consistent budget. Two failure modes drove
// the values below, both seen in prod on GET /president/[slug]:
//
//  - Cold start (Prisma P1001, "Can't reach database server"): Neon scales an
//    idle branch to zero; the first connection must wait out the ~1-5s resume.
//    `connect_timeout` gives one attempt room to do that; lib/prisma retries as
//    a backstop.
//  - Pool exhaustion (Prisma P2024, "Timed out fetching a new connection"): a
//    query waited `pool_timeout` for a free connection and gave up. This fired
//    two ways — (a) a cold connection still establishing at 15s while queued
//    queries gave up at pool_timeout=10s, and (b) the page's query fan-out
//    exceeding the pool under concurrent renders.
//
// The invariants that keep both closed:
//
//   CONNECT_TIMEOUT < POOL_TIMEOUT
//     A cold connection that is still establishing must not outlive the pool
//     checkout and resurface as a P2024. If the resume is slower than
//     CONNECT_TIMEOUT it fails as P1001 (which lib/prisma retries) — never P2024.
//     Note we actively CAP connect_timeout: the managed URL ships =15, which
//     violated this against pool_timeout=10, so filling-when-absent isn't enough.
//   POOL_TIMEOUT <= function budget (~10s for the SSR render)
//     A query waiting the full pool_timeout should fail as P2024 rather than be
//     killed by the platform's function timeout with a less actionable error.
//   CONNECTION_LIMIT comfortably exceeds the per-render concurrent query count
//     so a render (and a few concurrent renders on one warm instance) never
//     queues for a pool slot. Safe behind Neon's PgBouncer, which multiplexes
//     these onto far fewer real Postgres connections.
//
// Local (non-pooler) Postgres resolves instantly and needs none of the pool
// params; only connect_timeout is applied there, and it never fires.
const CONNECT_TIMEOUT_SECONDS = 8;
const POOL_TIMEOUT_SECONDS = 10;
const CONNECTION_LIMIT = 10;

export function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Not a parseable URL — hand it back untouched and let Prisma surface the
    // real validation error rather than masking it here.
    return raw;
  }

  // connect_timeout: ensure present AND not above the ceiling. A smaller
  // explicit value is respected; an absent, invalid, or too-large one (e.g. the
  // managed =15) is clamped so it stays below POOL_TIMEOUT.
  const ct = Number(url.searchParams.get("connect_timeout"));
  if (!Number.isFinite(ct) || ct <= 0 || ct > CONNECT_TIMEOUT_SECONDS) {
    url.searchParams.set("connect_timeout", String(CONNECT_TIMEOUT_SECONDS));
  }

  // Pool params only make sense against the Neon transaction pooler. pgbouncer
  // also disables the prepared statements PgBouncer can't proxy. Existing
  // explicit values always win.
  if (url.hostname.includes("-pooler")) {
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(POOL_TIMEOUT_SECONDS));
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", String(CONNECTION_LIMIT));
    }
  }

  return url.toString();
}
