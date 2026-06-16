// CLI runner for the URL-verification worker.
// Usage:
//   pnpm tsx db/run-url-verification.ts                  # verify all pending
//   pnpm tsx db/run-url-verification.ts --limit 50       # cap rows examined
//   pnpm tsx db/run-url-verification.ts --retry-failed   # also re-check 'failed'
//   pnpm tsx db/run-url-verification.ts --concurrency 16
//
// Production: schedule nightly via BullMQ (architecture-v1.md §9).

import { verifyAllPending } from "../lib/url-verification";

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const limit = readFlag("limit") ? parseInt(readFlag("limit")!, 10) : undefined;
  const concurrency = readFlag("concurrency")
    ? parseInt(readFlag("concurrency")!, 10)
    : undefined;
  const retryFailed = hasFlag("retry-failed");

  console.log(
    `Verifying URLs · concurrency=${concurrency ?? 8} · limit=${
      limit ?? "all"
    } · retryFailed=${retryFailed}`
  );

  let n = 0;
  const stats = await verifyAllPending({
    concurrency,
    limit,
    retryFailed,
    onResult: (e, r) => {
      n += 1;
      const tick = r.outcome === "verified" ? "✓" : "✗";
      const status = r.httpStatus ? ` [${r.httpStatus}]` : "";
      const detail = r.errorKind ? ` (${r.errorKind})` : "";
      // Only print every Nth row so CLI doesn't spam for 882-row runs.
      if (n % 25 === 0 || r.outcome === "failed") {
        console.log(
          `  ${tick} ${r.outcome}${status}${detail}  ${truncate(e.sourceUrl, 80)}`
        );
      }
    },
  });

  console.log("");
  console.log("✓ URL verification complete");
  console.log(`  examined:           ${stats.examined}`);
  console.log(`  verified:           ${stats.verified}`);
  console.log(`  failed:             ${stats.failed}`);
  console.log(`  skipped (no url):   ${stats.skipped}`);
  console.log(
    `  elapsed:            ${(stats.durationMs / 1000).toFixed(1)}s`
  );
  if (Object.keys(stats.failureBreakdown).length > 0) {
    console.log(`  failures by kind:`);
    for (const [k, v] of Object.entries(stats.failureBreakdown).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${k.padEnd(20)}  ${v}`);
    }
  }
  process.exit(0);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

main().catch((e) => {
  console.error("✗ URL verification failed", e);
  process.exit(1);
});
