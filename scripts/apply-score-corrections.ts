// Apply deliberate good_score/harm_score changes to scores/*.yaml.
//
// UNLIKE the fact_check / claim tooling, this DOES change scores — it is the
// "separate, deliberate edit" path. Changing a score alters category nets and
// rankings, so after running this you MUST regenerate the locked snapshot
// (vitest -u) and re-run scripts/compute_rankings.py; the snapshot diff is the
// audit trail of which rankings moved.
//
// Surgically replaces only the good_score / harm_score value tokens on the named
// sub-criterion (via the YAML node's source range) so the diff is minimal.
//
// Input JSON: [{ slug, subId, good_score?, harm_score? }]  (integers 0-10)
// Usage: pnpm tsx scripts/apply-score-corrections.ts --in score-edits.json [--dry-run]

import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";
import type { Scalar } from "yaml";

const SCORES_DIR = path.resolve(__dirname, "..", "scores");

interface ScoreEdit {
  slug: string;
  subId: string;
  good_score?: number;
  harm_score?: number;
}

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}

function processFile(slug: string, edits: ScoreEdit[], dryRun: boolean): string[] {
  const filePath = path.join(SCORES_DIR, `${slug}.yaml`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const doc = parseDocument(raw);
  const changes: { node: Scalar; value: string; label: string }[] = [];

  const cats = doc.get("categories") as any;
  for (const e of edits) {
    let sub: any;
    for (const catNode of cats?.items ?? []) {
      for (const subNode of (catNode.get("sub_criteria") as any)?.items ?? []) {
        if (String(subNode.get("id")) === e.subId) sub = subNode;
      }
    }
    if (!sub) {
      process.stderr.write(`  ⚠ ${slug}:${e.subId} not found — skipped\n`);
      continue;
    }
    for (const field of ["good_score", "harm_score"] as const) {
      const v = e[field];
      if (v === undefined) continue;
      if (!Number.isInteger(v) || v < 0 || v > 10) {
        throw new Error(`${slug}:${e.subId} ${field}=${v} must be an integer 0-10`);
      }
      const node = sub.get(field, true) as Scalar | undefined;
      if (!node?.range) {
        process.stderr.write(`  ⚠ ${slug}:${e.subId} has no ${field} node — skipped\n`);
        continue;
      }
      const old = String(node.value);
      if (old === String(v)) continue; // no-op
      changes.push({ node, value: String(v), label: `${e.subId} ${field} ${old}->${v}` });
    }
  }
  if (!changes.length) return [];

  let out = raw;
  changes.sort((a, b) => b.node.range![0] - a.node.range![0]);
  for (const { node, value } of changes) {
    const [start, valueEnd] = node.range!;
    out = out.slice(0, start) + value + out.slice(valueEnd);
  }
  if (!dryRun) fs.writeFileSync(filePath, out);
  return changes.map((c) => c.label);
}

function main() {
  const inPath = readFlag("in");
  if (!inPath) {
    process.stderr.write("error: --in <score-edits.json> required\n");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const edits: ScoreEdit[] = JSON.parse(fs.readFileSync(inPath, "utf-8"));
  const bySlug = new Map<string, ScoreEdit[]>();
  for (const e of edits) (bySlug.get(e.slug) ?? bySlug.set(e.slug, []).get(e.slug)!).push(e);

  let total = 0;
  for (const [slug, es] of bySlug) {
    const labels = processFile(slug, es, dryRun);
    total += labels.length;
    for (const l of labels) process.stderr.write(`  ${dryRun ? "[dry] " : ""}${slug}: ${l}\n`);
  }
  process.stderr.write(
    `${dryRun ? "DRY RUN — " : ""}${total} score field(s) changed. ` +
      `Remember: vitest -u + compute_rankings.py to refresh the snapshot.\n`
  );
}

main();
