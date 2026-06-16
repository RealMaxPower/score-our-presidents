// One-shot CLI wrapper for the outlier-detection job.
// Production: schedule via BullMQ (architecture-v1.md §9) or cron.
// Dev: run manually with `pnpm tsx db/run-outlier-detection.ts`.

import { detectOutliers } from "../lib/outlier-detection";

async function main() {
  const startedAt = Date.now();
  const stats = await detectOutliers();
  const elapsed = Date.now() - startedAt;
  console.log("✓ Outlier detection complete");
  console.log(`  groups examined:        ${stats.examinedGroups}`);
  console.log(`  scores flagged:         ${stats.flaggedThisRun}`);
  console.log(`  scores unflagged:       ${stats.unflaggedThisRun}`);
  console.log(`  reputation decrements:  ${stats.reputationDecrements}`);
  console.log(`  elapsed:                ${elapsed}ms`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ Outlier detection failed", e);
  process.exit(1);
});
