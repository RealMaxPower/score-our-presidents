// URL verification worker for Evidence rows.
//
// For each Evidence with `sourceUrl` and `verificationStatus = 'pending'` (or
// optionally 'failed' on retry), fetch the URL and write back:
//   - 'verified' on any 2xx response (after up to 5 redirects)
//   - 'failed' on 4xx / 5xx / network error / timeout / TLS error / DNS error
//   - 'not_applicable' (set elsewhere — never by this worker) for rows whose
//     source is a non-URL citation (e.g. pre-internet book references)
//
// Production: schedule nightly via BullMQ (architecture-v1.md §9).
// Dev: `pnpm tsx db/run-url-verification.ts`.

import { PrismaClient } from "@prisma/client";
import { isPublicHttpUrl } from "./user-scores";

// Worker-local Prisma client. `lib/prisma.ts` is server-only and can't be
// imported from a tsx CLI context (where this worker typically runs).
const prisma = new PrismaClient();

// Default identifying UA — preferred so server logs can attribute traffic.
const IDENTIFIED_UA =
  "ScoreOurPresidents-URLVerifier/1.0 (+https://www.scoreourpresidents.org/methodology)";
// Browser-spoof UA used only as last-ditch retry when an anti-bot WAF
// (Cloudflare, Akamai, federal sites with strict UA filters) returns
// 403/406/429/503 to our identified bot.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const DEFAULT_CONCURRENCY = 8;

// HTTP statuses that smell like "your bot was blocked, not your URL was bad."
// Worth retrying with a browser-like UA before declaring failure.
const ANTIBOT_STATUSES = new Set([401, 403, 406, 429, 503]);

export type VerificationOutcome = "verified" | "failed";

export interface VerifyResult {
  outcome: VerificationOutcome;
  httpStatus?: number;
  errorKind?:
    | "timeout"
    | "dns"
    | "tls"
    | "ssrf-blocked"
    | "too-many-redirects"
    | "client-error"
    | "server-error"
    | "fetch-error";
  errorMessage?: string;
}

/**
 * Verify one URL. Three-stage escalation:
 *   1. HEAD with identifying UA (cheap, attributable)
 *   2. GET with identifying UA + Range header (some servers 405 on HEAD)
 *   3. GET with browser UA (last-ditch for anti-bot WAFs returning 403/429/etc)
 *
 * Each stage has its own timeout. SSRF-blocked URLs short-circuit.
 */
export async function verifyOne(url: string): Promise<VerifyResult> {
  if (!isPublicHttpUrl(url)) {
    return {
      outcome: "failed",
      errorKind: "ssrf-blocked",
      errorMessage: "URL targets a non-public or non-http(s) host",
    };
  }

  const head = await fetchOnce(url, "HEAD", IDENTIFIED_UA);
  if (head.outcome === "verified") return head;

  // HEAD-method rejection or network error → escalate to GET with same UA
  const retryAsGet =
    head.errorKind === "client-error" || head.errorKind === "fetch-error";
  if (retryAsGet) {
    const getIdentified = await fetchOnce(url, "GET", IDENTIFIED_UA);
    if (getIdentified.outcome === "verified") return getIdentified;
    // Anti-bot block → escalate UA. Otherwise return the GET result as-is.
    if (
      getIdentified.httpStatus &&
      ANTIBOT_STATUSES.has(getIdentified.httpStatus)
    ) {
      const getBrowser = await fetchOnce(url, "GET", BROWSER_UA);
      return getBrowser;
    }
    return getIdentified;
  }

  // HEAD returned a real server response (e.g. 500) — try browser UA only
  // if it smells like anti-bot. Otherwise stop here.
  if (head.httpStatus && ANTIBOT_STATUSES.has(head.httpStatus)) {
    const getBrowser = await fetchOnce(url, "GET", BROWSER_UA);
    return getBrowser;
  }
  return head;
}

async function fetchOnce(
  url: string,
  method: "HEAD" | "GET",
  userAgent: string
): Promise<VerifyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      // node fetch caps redirects at 20 by default; we want stricter.
      // There's no first-class redirect-cap option in undici/fetch, so we
      // accept default behavior and trust the timeout. In practice 20 is
      // fine since we'd rather miss a pathological loop than fail valid pages.
      headers: {
        "User-Agent": userAgent,
        // Discourage cached redirects; we want the live URL state.
        "Cache-Control": "no-cache",
        // Browser-UA fallback also needs Accept/Accept-Language to look real
        // to picky WAFs. Cheap to include unconditionally.
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
      },
      signal: controller.signal,
    });

    if (res.status >= 200 && res.status < 300) {
      return { outcome: "verified", httpStatus: res.status };
    }
    if (res.status === 206) {
      // Partial Content from our Range request also = verified.
      return { outcome: "verified", httpStatus: res.status };
    }
    if (res.status >= 400 && res.status < 500) {
      return {
        outcome: "failed",
        httpStatus: res.status,
        errorKind: "client-error",
        errorMessage: `${method} returned ${res.status}`,
      };
    }
    return {
      outcome: "failed",
      httpStatus: res.status,
      errorKind: "server-error",
      errorMessage: `${method} returned ${res.status}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("aborted") || msg.includes("AbortError")) {
      return {
        outcome: "failed",
        errorKind: "timeout",
        errorMessage: `Timed out after ${REQUEST_TIMEOUT_MS}ms`,
      };
    }
    if (
      msg.toLowerCase().includes("enotfound") ||
      msg.toLowerCase().includes("getaddrinfo")
    ) {
      return {
        outcome: "failed",
        errorKind: "dns",
        errorMessage: msg,
      };
    }
    if (
      msg.toLowerCase().includes("tls") ||
      msg.toLowerCase().includes("ssl") ||
      msg.toLowerCase().includes("certificate")
    ) {
      return {
        outcome: "failed",
        errorKind: "tls",
        errorMessage: msg,
      };
    }
    return {
      outcome: "failed",
      errorKind: "fetch-error",
      errorMessage: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}

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
