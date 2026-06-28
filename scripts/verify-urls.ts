// Track A — URL liveness, YAML-native.
//
// Reads scores/*.yaml (the source of truth), checks each evidence source_url for
// liveness, and writes the resulting status BACK INTO THE YAML so the result is
// durable in git (the DB worker in lib/url-verification.ts only writes Postgres,
// which db/seed.ts wipes on every reseed).
//
// Design notes (see plan + lib/url-liveness.ts):
//   - Dedupe by URL: ~580 of 643 fetchable URLs are shared/bare homepages, so we
//     fetch each DISTINCT url once and fan the result to every entry sharing it.
//   - Per-host throttle: the corpus is ~80% .gov concentrated on a few origins;
//     we serialize requests per host with a delay and parallelize ACROSS hosts,
//     so we never burst congress.gov/archives.gov into a 429.
//   - Classify, don't flatten:
//       verified  = 2xx on a deep link (path beyond "/")
//       shallow   = 2xx on a bare origin — liveness is near-meaningless; needs a
//                   deep link (Track B). NOT credited as verified.
//       failed    = 4xx / DNS / TLS / SSRF-blocked — a human must fix the URL.
//       (retryable) timeout / 429 / 503 / 5xx → left UNCHANGED (stays pending) so
//                   a re-run picks it up; we never hard-fail a throttled host.
//       not_applicable = source_url "canonical" (book/speech, nothing to fetch).
//   - Write-back is a surgical replacement of just the `verification_status:`
//     value token (via the YAML node's source range), so the git diff is exactly
//     one token per changed entry — no comment/string reflow.
//
// Usage:
//   pnpm tsx scripts/verify-urls.ts --dry-run            # report, write nothing
//   pnpm tsx scripts/verify-urls.ts --only bill_clinton  # one file
//   pnpm tsx scripts/verify-urls.ts                      # all files, write back
//   pnpm tsx scripts/verify-urls.ts --retry              # also re-check failed/shallow
//   flags: --concurrency <hosts> --delay <ms> --limit <n>

import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";
import type { Document, Scalar } from "yaml";
import { verifyOne, urlDepth, type VerifyResult } from "../lib/url-liveness";

const SCORES_DIR = path.resolve(__dirname, "..", "scores");
const ALL_SLUGS = [
  "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
  "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
  "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
  "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
];

type NewStatus = "verified" | "shallow" | "failed" | "not_applicable" | "retryable";

interface Target {
  slug: string;
  subId: string;
  sourceUrl: string;
  isCanonical: boolean;
  currentStatus: string;
  node: Scalar; // the verification_status value scalar, carries .range
}

interface FileState {
  slug: string;
  raw: string;
  doc: Document;
  targets: Target[];
}

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parse one file and collect its (≤1 evidence per sub) verification targets. */
function loadFile(slug: string): FileState {
  const raw = fs.readFileSync(path.join(SCORES_DIR, `${slug}.yaml`), "utf-8");
  const doc = parseDocument(raw);
  const targets: Target[] = [];
  const cats = doc.get("categories") as any;
  for (const catNode of cats?.items ?? []) {
    const subs = catNode.get("sub_criteria") as any;
    for (const subNode of subs?.items ?? []) {
      const subId = String(subNode.get("id"));
      const evSeq = subNode.get("evidence") as any;
      const ev = evSeq?.items?.[0];
      if (!ev) continue; // empty evidence (era-N/A)
      const statusNode = ev.get("verification_status", true) as Scalar | undefined;
      if (!statusNode) continue;
      const sourceUrl = String(ev.get("source_url") ?? "");
      targets.push({
        slug,
        subId,
        sourceUrl,
        isCanonical: sourceUrl === "canonical",
        currentStatus: String(statusNode.value),
        node: statusNode,
      });
    }
  }
  return { slug, raw, doc, targets };
}

/** Map a liveness result + URL depth to the new status word. */
function classify(result: VerifyResult, url: string): NewStatus {
  if (result.outcome === "verified") {
    return urlDepth(url) === 0 ? "shallow" : "verified";
  }
  // failed — distinguish "the URL is bad" from "the host throttled/erred us".
  if (result.errorKind === "timeout" || result.errorKind === "server-error") return "retryable";
  if (result.httpStatus === 429 || result.httpStatus === 503) return "retryable";
  return "failed";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Fetch distinct URLs, serialized per host (with delay), parallel across hosts. */
async function fetchDistinct(
  urls: string[],
  hostConcurrency: number,
  delayMs: number,
  onResult: (url: string, r: VerifyResult) => void
): Promise<Map<string, VerifyResult>> {
  const byHost = new Map<string, string[]>();
  for (const u of urls) {
    const h = hostOf(u);
    (byHost.get(h) ?? byHost.set(h, []).get(h)!).push(u);
  }
  const results = new Map<string, VerifyResult>();
  const hosts = [...byHost.keys()];
  let hcursor = 0;
  async function hostWorker() {
    while (hcursor < hosts.length) {
      const host = hosts[hcursor++];
      const hostUrls = byHost.get(host)!;
      for (let i = 0; i < hostUrls.length; i++) {
        const url = hostUrls[i];
        const r = await verifyOne(url);
        results.set(url, r);
        onResult(url, r);
        if (i < hostUrls.length - 1 && delayMs > 0) await sleep(delayMs);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(hostConcurrency, hosts.length) }, () => hostWorker())
  );
  return results;
}

/** Surgically replace each target's status token in the raw buffer (end-first). */
function applyUpdates(file: FileState, updates: { node: Scalar; value: string }[]): string {
  let out = file.raw;
  const sorted = [...updates].sort((a, b) => (b.node.range![0] - a.node.range![0]));
  for (const { node, value } of sorted) {
    const [start, valueEnd] = node.range!;
    out = out.slice(0, start) + value + out.slice(valueEnd);
  }
  return out;
}

async function main() {
  const only = readFlag("only");
  const slugs = only ? [only] : ALL_SLUGS;
  const dryRun = hasFlag("dry-run");
  const retry = hasFlag("retry");
  const limit = readFlag("limit") ? parseInt(readFlag("limit")!, 10) : undefined;
  const hostConcurrency = readFlag("concurrency") ? parseInt(readFlag("concurrency")!, 10) : 6;
  const delayMs = readFlag("delay") ? parseInt(readFlag("delay")!, 10) : 400;

  const toFetch = new Set(["pending", ...(retry ? ["failed", "shallow", "retryable"] : [])]);

  const files = slugs.map(loadFile);
  const allTargets = files.flatMap((f) => f.targets);

  // Distinct fetchable URLs that have at least one target needing a fetch.
  const fetchableTargets = allTargets.filter((t) => !t.isCanonical && toFetch.has(t.currentStatus));
  let distinctUrls = [...new Set(fetchableTargets.map((t) => t.sourceUrl))];
  if (limit) distinctUrls = distinctUrls.slice(0, limit);
  const fetchSet = new Set(distinctUrls);

  console.log(
    `Track A · URL liveness · files=${files.length} · evidence=${allTargets.length} · ` +
      `distinct URLs to fetch=${distinctUrls.length} · hostConcurrency=${hostConcurrency} · ` +
      `delay=${delayMs}ms · dryRun=${dryRun} · retry=${retry}`
  );

  let done = 0;
  const urlResults = await fetchDistinct(distinctUrls, hostConcurrency, delayMs, (url, r) => {
    done += 1;
    if (done % 25 === 0 || r.outcome === "failed") {
      const cls = classify(r, url);
      const status = r.httpStatus ? `[${r.httpStatus}]` : "";
      const kind = r.errorKind ? `(${r.errorKind})` : "";
      console.log(`  ${done}/${distinctUrls.length} ${cls.padEnd(8)} ${status}${kind} ${url.slice(0, 80)}`);
    }
  });

  // Decide each target's new status and collect per-file updates.
  const tally: Record<string, number> = {
    verified: 0, shallow: 0, failed: 0, not_applicable: 0, retryable: 0, unchanged: 0,
  };
  const failureKinds: Record<string, number> = {};
  const failedUrls: { slug: string; subId: string; url: string; detail: string }[] = [];
  const updatesByFile = new Map<string, { node: Scalar; value: string }[]>();

  for (const f of files) {
    const ups: { node: Scalar; value: string }[] = [];
    for (const t of f.targets) {
      let next = t.currentStatus;
      if (t.isCanonical) {
        next = t.currentStatus === "pending" ? "not_applicable" : t.currentStatus;
      } else if (fetchSet.has(t.sourceUrl)) {
        const r = urlResults.get(t.sourceUrl)!;
        const cls = classify(r, t.sourceUrl);
        if (cls === "retryable") {
          next = t.currentStatus; // leave as-is; re-run will retry
          if (t.currentStatus === "pending") tally.retryable += 1;
        } else {
          next = cls;
          if (cls === "failed") {
            const k = r.errorKind ?? "unknown";
            failureKinds[k] = (failureKinds[k] ?? 0) + 1;
            failedUrls.push({
              slug: t.slug, subId: t.subId, url: t.sourceUrl,
              detail: `${r.httpStatus ?? ""} ${r.errorKind ?? ""}`.trim(),
            });
          }
        }
      }
      if (next !== t.currentStatus) {
        ups.push({ node: t.node, value: next });
        tally[next] = (tally[next] ?? 0) + 1;
      } else if (!(t.isCanonical || fetchSet.has(t.sourceUrl)) ) {
        tally.unchanged += 1;
      }
    }
    if (ups.length) updatesByFile.set(f.slug, ups);
  }

  // Write back (unless dry-run).
  let filesWritten = 0;
  for (const f of files) {
    const ups = updatesByFile.get(f.slug);
    if (!ups?.length) continue;
    const next = applyUpdates(f, ups);
    if (!dryRun) {
      fs.writeFileSync(path.join(SCORES_DIR, `${f.slug}.yaml`), next);
      filesWritten += 1;
    }
  }

  console.log("");
  console.log(dryRun ? "DRY RUN — no files written" : `✓ wrote ${filesWritten} file(s)`);
  console.log(`  → verified:        ${tally.verified}`);
  console.log(`  → shallow:         ${tally.shallow}   (bare homepages — need deep links, Track B)`);
  console.log(`  → failed:          ${tally.failed}`);
  console.log(`  → not_applicable:  ${tally.not_applicable}   (canonical)`);
  console.log(`  → retryable(left pending): ${tally.retryable}`);
  if (Object.keys(failureKinds).length) {
    console.log("  failures by kind:");
    for (const [k, v] of Object.entries(failureKinds).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k.padEnd(16)} ${v}`);
    }
  }
  if (failedUrls.length) {
    console.log("  failed URLs (need a human fix):");
    for (const f of failedUrls.slice(0, 50)) {
      console.log(`    ${f.slug}:${f.subId}  ${f.detail.padEnd(20)} ${f.url.slice(0, 80)}`);
    }
    if (failedUrls.length > 50) console.log(`    … and ${failedUrls.length - 50} more`);
  }
}

main().catch((e) => {
  console.error("✗ verify-urls failed", e);
  process.exit(1);
});
