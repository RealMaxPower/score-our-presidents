// Prisma client singleton per architecture-v1.md §4
// Avoids client recreation in Next.js dev/HMR
//
// Server-only — a client component importing prisma is always a bug.
import "server-only";

import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "./env";
import { normalizeDatabaseUrl } from "./db-url";

// Neon (and serverless Postgres generally) scales idle connections to zero,
// so the first query after a quiet period can miss the cold-start window and
// throw a connection error before the DB is actually reachable. These are
// transient: a retry a few hundred ms later almost always succeeds.
//
// Prisma surfaces them as PrismaClientInitializationError ("Can't reach
// database server") or one of the P100x connection request codes. All of these
// fail *before* the query reaches the server, so retrying is safe even for
// writes — the operation never executed.
//
// P2024 ("Timed out fetching a new connection from the pool") is included as a
// backstop: it also fires before the query executes (no connection was ever
// acquired), and it's transient — a busy connection frees up, or a cold one
// finishes establishing. lib/db-url.ts and the /president/[slug] query batching
// are the real fixes; this just absorbs a residual spike instead of 500ing.
const RETRYABLE_DB_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

function isRetryableDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_DB_CODES.has(err.code);
  }
  return false;
}

// Neon resume-from-scale-to-zero usually completes in 1-5s, but a fully cold
// branch can take longer, so the retry budget must cover the worst case while
// staying under Vercel's ~10s SSR function timeout. 6 attempts with a 250ms
// base and exponential back-off capped at 2s span up to ~5.75s before the final
// attempt — enough headroom for a slow resume, with margin left for the query.
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 2000;

// A cold page render fires several queries concurrently (generateMetadata, plus
// the page's own Promise.all waves). With a deterministic back-off they would
// all retry in lockstep and hammer the resuming compute at the same instants;
// "equal jitter" (half fixed, half random) staggers them so retries arrive
// spread out as the branch comes back online.
function backoffDelay(attempt: number): number {
  const exp = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return exp / 2 + Math.random() * (exp / 2);
}

async function runWithRetry<T>(op: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (attempt === RETRY_ATTEMPTS - 1 || !isRetryableDbError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
    }
  }
  throw lastErr;
}

// Build the client once, then extend it so EVERY operation (model queries and
// raw) transparently retries transient connection failures. This replaces the
// old per-call-site withDbRetry wrapping — no route can forget to opt in.
function createPrismaClient() {
  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    datasources: { db: { url: normalizeDatabaseUrl(env.DATABASE_URL) } },
  }).$extends({
    query: {
      $allOperations({ args, query }) {
        return runWithRetry(() => query(args));
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = global as unknown as { prisma?: ExtendedPrismaClient };

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
