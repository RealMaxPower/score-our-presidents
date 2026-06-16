// Prisma client singleton per architecture-v1.md §4
// Avoids client recreation in Next.js dev/HMR
//
// Server-only — a client component importing prisma is always a bug.
import "server-only";

import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "./env";

// Neon (and serverless Postgres generally) scales idle connections to zero,
// so the first query after a quiet period can miss the cold-start window and
// throw a connection error before the DB is actually reachable. These are
// transient: a retry a few hundred ms later almost always succeeds.
//
// Prisma surfaces them as PrismaClientInitializationError ("Can't reach
// database server") or one of the P100x connection request codes. All of these
// fail *before* the query reaches the server, so retrying is safe even for
// writes — the operation never executed.
const RETRYABLE_DB_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isRetryableDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_DB_CODES.has(err.code);
  }
  return false;
}

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 150;

async function runWithRetry<T>(op: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (attempt === RETRY_ATTEMPTS - 1 || !isRetryableDbError(err)) throw err;
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** attempt)
      );
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
