// URL verification worker for Evidence rows.
//
// For each Evidence with `sourceUrl` and `verificationStatus = 'pending'` (or
// optionally 'failed' on retry), fetch the URL and write back:
//   - 'verified' on any 2xx response (after up to 5 redirects)
//   - 'failed' on 4xx / 5xx / network error / timeout / TLS error / DNS error
//   - 'not_applicable' (set elsewhere — never by this worker) for rows whose
//     source is a non-URL citation (e.g. pre-internet book references)
//
// The pure fetch/escalation/SSRF logic lives in ./url-liveness (DB-free) so it
// can be reused by the YAML-native tool (scripts/verify-urls.ts) without pulling
// in the Prisma client constructed below. Re-exported here for back-compat.
//
// Production: schedule nightly via BullMQ (architecture-v1.md §9).
// Dev: `pnpm tsx db/run-url-verification.ts`.

import { PrismaClient } from "@prisma/client";
import { verifyOne } from "./url-liveness";
import type { VerifyResult } from "./url-liveness";

export {
  verifyOne,
  fetchOnce,
  urlDepth,
  IDENTIFIED_UA,
  BROWSER_UA,
  REQUEST_TIMEOUT_MS,
  MAX_REDIRECTS,
  ANTIBOT_STATUSES,
} from "./url-liveness";
export type { VerificationOutcome, VerifyResult } from "./url-liveness";

// Worker-local Prisma client. `lib/prisma.ts` is server-only and can't be
// imported from a tsx CLI context (where this worker typically runs).
const prisma = new PrismaClient();

const DEFAULT_CONCURRENCY = 8;

export interface BatchOptions {
  /** Concurrent in-flight requests. Default 8. */
  concurrency?: number;
  /** Max number of evidence rows to verify in this pass. */
  limit?: number;
  /** Include rows currently 'failed' (retry). Default false. */
  retryFailed?: boolean;
  /** Called per row with the resolved verdict — used for CLI progress. */
  onResult?: (
    e: { id: string; sourceUrl: string },
    result: VerifyResult
  ) => void;
}

export interface BatchStats {
  examined: number;
  verified: number;
  failed: number;
  skipped: number; // rows with no sourceUrl (citation-only)
  durationMs: number;
  failureBreakdown: Record<string, number>;
}

/**
 * Walk every pending Evidence row, verify in parallel, write back the result.
 * Idempotent — re-running picks up new pending rows (and failures if
 * `retryFailed` is true).
 */
export async function verifyAllPending(opts: BatchOptions = {}): Promise<
  BatchStats
> {
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const statuses = opts.retryFailed ? ["pending", "failed"] : ["pending"];

  const candidates = await prisma.evidence.findMany({
    where: {
      verificationStatus: { in: statuses },
    },
    select: { id: true, sourceUrl: true },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const stats: BatchStats = {
    examined: candidates.length,
    verified: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    failureBreakdown: {},
  };
  const start = Date.now();

  // Partition into three buckets:
  //   - empty / "canonical" / non-URL string → 'not_applicable' (rely on the
  //     citation field for pre-internet or book sources)
  //   - real URL → fetchable
  //   - rows without any sourceUrl at all → skipped (untouched)
  // The seed YAMLs sometimes use `source_url: "canonical"` as a literal
  // marker for "no URL, the citation is canonical." That's not a fetch
  // candidate — mark it `not_applicable` instead of failing it.
  const fetchable: { id: string; sourceUrl: string }[] = [];
  const notApplicableIds: string[] = [];
  for (const c of candidates) {
    if (!c.sourceUrl || c.sourceUrl.trim().length === 0) {
      stats.skipped += 1;
      continue;
    }
    const url = c.sourceUrl.trim();
    let isFetchable = false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        isFetchable = true;
      }
    } catch {
      isFetchable = false;
    }
    if (isFetchable) {
      fetchable.push({ id: c.id, sourceUrl: url });
    } else {
      notApplicableIds.push(c.id);
    }
  }

  // Bulk-mark the non-URL rows in one statement (cheaper than per-row update).
  if (notApplicableIds.length > 0) {
    await prisma.evidence.updateMany({
      where: { id: { in: notApplicableIds } },
      data: {
        verificationStatus: "not_applicable",
        verifiedAt: new Date(),
      },
    });
    stats.skipped += notApplicableIds.length;
  }

  // Concurrency-limited fan-out
  let cursor = 0;
  async function worker() {
    while (cursor < fetchable.length) {
      const idx = cursor++;
      const e = fetchable[idx];
      const result = await verifyOne(e.sourceUrl);
      await prisma.evidence.update({
        where: { id: e.id },
        data: {
          verificationStatus: result.outcome,
          verifiedAt: new Date(),
        },
      });
      if (result.outcome === "verified") {
        stats.verified += 1;
      } else {
        stats.failed += 1;
        const k = result.errorKind ?? "unknown";
        stats.failureBreakdown[k] = (stats.failureBreakdown[k] ?? 0) + 1;
      }
      opts.onResult?.(e, result);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, fetchable.length) }, () =>
      worker()
    )
  );

  stats.durationMs = Date.now() - start;
  return stats;
}
