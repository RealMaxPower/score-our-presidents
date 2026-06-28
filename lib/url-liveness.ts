// Pure URL-liveness checking — no database dependency.
//
// Extracted from lib/url-verification.ts so a YAML-native tool (scripts/
// verify-urls.ts) can reuse the exact fetch/escalation/SSRF logic WITHOUT
// importing the Prisma client that url-verification.ts instantiates at module
// load. lib/url-verification.ts re-exports these symbols, so existing importers
// are unaffected.
//
// "Liveness" here means only: does the URL resolve to a 2xx response? It says
// nothing about whether the page supports any particular claim. Treat a 2xx on
// a bare origin (e.g. https://www.congress.gov/) with suspicion — see
// `urlDepth()` and the `shallow` classification in scripts/verify-urls.ts.

import { isPublicHttpUrl } from "./user-scores";

// Default identifying UA — preferred so server logs can attribute traffic.
export const IDENTIFIED_UA =
  "ScoreOurPresidents-URLVerifier/1.0 (+https://www.scoreourpresidents.org/methodology)";
// Browser-spoof UA used only as last-ditch retry when an anti-bot WAF
// (Cloudflare, Akamai, federal sites with strict UA filters) returns
// 403/406/429/503 to our identified bot.
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;

// HTTP statuses that smell like "your bot was blocked, not your URL was bad."
// Worth retrying with a browser-like UA before declaring failure.
export const ANTIBOT_STATUSES = new Set([401, 403, 406, 429, 503]);

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

export async function fetchOnce(
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

/**
 * Path depth of an http(s) URL, used to distinguish a real deep link from a
 * bare homepage. Returns 0 for an origin with no path ("/" or empty), and the
 * number of non-empty path segments otherwise.
 *
 *   https://www.congress.gov/            → 0  (shallow — liveness is near-meaningless)
 *   https://www.congress.gov/bill/74     → 2  (deep link)
 *
 * Returns -1 if the string is not a parseable http(s) URL.
 */
export function urlDepth(url: string): number {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return -1;
    const segments = u.pathname.split("/").filter((s) => s.length > 0);
    return segments.length;
  } catch {
    return -1;
  }
}
