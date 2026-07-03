// Pure connection-string helpers, kept free of `server-only` and any client
// construction so they stay unit-testable in a plain node environment.
//
// The cold-start protection in lib/prisma.ts only works if the pooled URL
// carries `connect_timeout` (so a single attempt waits out Neon's resume) and,
// for the Neon transaction pooler, `pgbouncer=true` (so Prisma disables the
// prepared statements PgBouncer can't proxy). Vercel's Neon integration sets
// those on POSTGRES_PRISMA_URL, but it *also* often sets a bare DATABASE_URL
// without them — and since those vars are integration-managed we can't hand-edit
// them, and lib/env.ts only aliases POSTGRES_PRISMA_URL when DATABASE_URL is
// unset. So a bare managed DATABASE_URL would silently defeat the wait-out.
// Normalizing here restores the guarantee regardless of which var the platform
// populated.
//
// Safe everywhere: connect_timeout never fires against a local Postgres that
// resolves instantly, and pgbouncer is only added when the host is a Neon
// pooler. Existing params always win — we never override an explicit value.
const NEON_CONNECT_TIMEOUT_SECONDS = "15";

export function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Not a parseable URL — hand it back untouched and let Prisma surface the
    // real validation error rather than masking it here.
    return raw;
  }
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", NEON_CONNECT_TIMEOUT_SECONDS);
  }
  const isNeonPooler = url.hostname.includes("-pooler");
  if (isNeonPooler && !url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }
  return url.toString();
}
