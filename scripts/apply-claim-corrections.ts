// Apply human-reviewed claim/citation/source_url corrections to scores/*.yaml.
//
// Surgically replaces only the named scalar value tokens on a given evidence
// entry (keyed by slug + subId, ≤1 evidence per sub), via the YAML node's source
// range — so the git diff touches only the corrected field(s), no reflow.
//
// NEVER touches good_score/harm_score. These are factual wording/source fixes
// surfaced by Track B; they do not change scores, so the ranking snapshot stays
// green. (A genuine score change is a separate, deliberate edit — see plan.)
//
// Input JSON: [{ slug, subId, claim?, citation?, source_url? }]
// Usage: pnpm tsx scripts/apply-claim-corrections.ts --in corrections.json [--dry-run]

import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";
import type { Scalar } from "yaml";

const SCORES_DIR = path.resolve(__dirname, "..", "scores");

interface Correction {
  slug: string;
  subId: string;
  claim?: string;
  citation?: string;
  source_url?: string;
}

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}

function processFile(slug: string, corrections: Correction[], dryRun: boolean): number {
  const filePath = path.join(SCORES_DIR, `${slug}.yaml`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const doc = parseDocument(raw);

  const edits: { node: Scalar; value: string }[] = [];
  const cats = doc.get("categories") as any;
  for (const c of corrections) {
    let ev: any;
    for (const catNode of cats?.items ?? []) {
      for (const subNode of (catNode.get("sub_criteria") as any)?.items ?? []) {
        if (String(subNode.get("id")) === c.subId) ev = (subNode.get("evidence") as any)?.items?.[0];
      }
    }
    if (!ev) {
      process.stderr.write(`  ⚠ ${slug}:${c.subId} not found — skipped\n`);
      continue;
    }
    for (const field of ["claim", "citation", "source_url"] as const) {
      const val = c[field];
      if (val === undefined) continue;
      const node = ev.get(field, true) as Scalar | undefined;
      if (!node?.range) {
        process.stderr.write(`  ⚠ ${slug}:${c.subId} has no ${field} node — skipped that field\n`);
        continue;
      }
      // JSON.stringify yields a valid YAML double-quoted scalar (same escapes).
      edits.push({ node, value: JSON.stringify(val) });
    }
  }
  if (!edits.length) return 0;

  // Apply end-first so offsets stay valid.
  let out = raw;
  edits.sort((a, b) => b.node.range![0] - a.node.range![0]);
  for (const { node, value } of edits) {
    const [start, valueEnd] = node.range!;
    out = out.slice(0, start) + value + out.slice(valueEnd);
  }
  if (!dryRun) fs.writeFileSync(filePath, out);
  return edits.length;
}

function main() {
  const inPath = readFlag("in");
  if (!inPath) {
    process.stderr.write("error: --in <corrections.json> required\n");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const corrections: Correction[] = JSON.parse(fs.readFileSync(inPath, "utf-8"));

  const bySlug = new Map<string, Correction[]>();
  for (const c of corrections) (bySlug.get(c.slug) ?? bySlug.set(c.slug, []).get(c.slug)!).push(c);

  let total = 0;
  for (const [slug, cs] of bySlug) {
    const n = processFile(slug, cs, dryRun);
    total += n;
    process.stderr.write(`  ${dryRun ? "[dry] " : ""}${slug}: ${n} field(s) corrected\n`);
  }
  process.stderr.write(`${dryRun ? "DRY RUN — " : ""}corrected ${total} field(s) across ${bySlug.size} file(s)\n`);
}

main();
