// User-submitted score validation + gating helpers.
//
// Submission gates (these block the API call):
//   - email_verified is required
//   - reputation ≥ MIN_REPUTATION_TO_SUBMIT
//   - submission carries ≥1 source URL with a claim
//
// The account-age check that used to live here at 7 days was dropped: the
// "wait a week before you can contribute" UX killed early engagement, and
// the other defenses (email-verify, per-IP rate limit on account creation,
// outlier detection with reputation discount, reputation floor) cover the
// brigading threat model adequately.
//
// Note: aggregation-time still has a 24h cutoff in `lib/community-weights.ts`
// for the community-weights page — a new account's submissions enter the
// median only after the account is a day old. Invisible to the contributor;
// just delays the impact on aggregates by enough to break bot pipelines.

import { z } from "zod";
import type { SessionUser } from "./auth";

export const MIN_REPUTATION_TO_SUBMIT = 0.5;

export interface SubmissionEligibility {
  eligible: boolean;
  reasons: string[];
}

export function evaluateEligibility(
  user: SessionUser | null
): SubmissionEligibility {
  if (!user) {
    return { eligible: false, reasons: ["Sign in to submit a score."] };
  }
  const reasons: string[] = [];
  if (!user.emailVerified) {
    reasons.push("Verify your email before submitting scores.");
  }
  if (user.reputationScore < MIN_REPUTATION_TO_SUBMIT) {
    reasons.push(
      `Reputation must be ≥ ${MIN_REPUTATION_TO_SUBMIT} (yours is ${user.reputationScore.toFixed(2)}).`
    );
  }
  return { eligible: reasons.length === 0, reasons };
}

export const SOURCE_TYPES = [
  "academic",
  "journalism",
  "primary_document",
  "statistic",
  "historical_record",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// SSRF-safe URL validation for user-submitted source URLs. Evidence URLs are
// stored on submission and later fetched by the URL-verification worker
// (see UrlVerificationLog in schema.prisma). Rejecting unsafe hosts at
// write-time prevents bad data from accumulating before the worker ships.
//
// Blocks: non-http(s) schemes, localhost, loopback, link-local, RFC1918
// private ranges, CGNAT, multicast, and any IPv6 literal.
export function isPublicHttpUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost") return false;
  // IPv6 literals show up bracketed; reject wholesale (rare in citations).
  if (host.startsWith("[")) return false;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((o) => o > 255)) return false;
    const [a, b] = octets;
    if (a === 0) return false; // "this network"
    if (a === 10) return false; // RFC1918
    if (a === 127) return false; // loopback
    if (a === 169 && b === 254) return false; // link-local
    if (a === 172 && b >= 16 && b <= 31) return false; // RFC1918
    if (a === 192 && b === 168) return false; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a >= 224) return false; // multicast + reserved
  }
  return true;
}

export const evidenceSourceUrl = z
  .string()
  .url()
  .refine(isPublicHttpUrl, {
    message:
      "sourceUrl must be a public http(s) URL (no localhost or private ranges)",
  });
