// Track B — write fact_check verdicts back into scores/*.yaml.
//
// Input: a JSON array of verdicts, each:
//   { slug, subId, status, confidence?, checked_by?, checked_at?, note?, suggested_fix? }
// where status ∈ supported|partial|unsupported|cant_verify (see lib/score-schema.ts).
//
// Inserts (or replaces, for idempotent re-runs) a `fact_check:` block on the
// evidence entry, immediately after its `verification_status:` line. Pure text
// insertion at the correct indent → clean, additive git diffs with no reflow of
// the surrounding claim/notes strings.
//
// fact_check is INERT to scoring: it never touches good_score/harm_score, so the
// locked ranking snapshot stays green. A verdict that warrants a SCORE change is
// a separate, deliberate edit (see plan / CONTRIBUTING.md).
//
// Usage:
//   pnpm tsx scripts/factcheck-writeback.ts --in verdicts.json
//   pnpm tsx scripts/factcheck-writeback.ts --in verdicts.json --dry-run

import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";
import type { Scalar } from "yaml";

const SCORES_DIR = path.resolve(__dirname, "..", "scores");

interface Verdict {
  slug: string;
  subId: string;
  status: "supported" | "partial" | "unsupported" | "cant_verify";
  confidence?: "high" | "medium" | "low";
  checked_by?: "agent" | "human";
  checked_at?: string;
  note?: string;
  suggested_fix?: string;
}

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}

/** Offset → 0-based line index. */
function lineOf(raw: string, offset: number): number {
  let n = 0;
  for (let i = 0; i < offset && i < raw.length; i++) if (raw[i] === "\n") n++;
  return n;
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

/** Build the indented fact_check block lines (no trailing newline). */
function blockLines(v: Verdict, indent: number): string[] {
  const pad = " ".repeat(indent);
  const cpad = " ".repeat(indent + 2);
  const out = [`${pad}fact_check:`, `${cpad}status: ${v.status}`];
  if (v.confidence) out.push(`${cpad}confidence: ${v.confidence}`);
  out.push(`${cpad}checked_by: ${v.checked_by ?? "agent"}`);
  if (v.checked_at) out.push(`${cpad}checked_at: ${v.checked_at}`);
  if (v.note) out.push(`${cpad}note: ${JSON.stringify(v.note)}`);
  if (v.suggested_fix) out.push(`${cpad}suggested_fix: ${JSON.stringify(v.suggested_fix)}`);
  return out;
}

function processFile(slug: string, verdicts: Verdict[], dryRun: boolean): number {
  const filePath = path.join(SCORES_DIR, `${slug}.yaml`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const doc = parseDocument(raw);

  // Resolve each verdict to the line index of its verification_status line.
  type Edit = { statusLine: number; indent: number; lines: string[] };
  const edits: Edit[] = [];
  const cats = doc.get("categories") as any;
  for (const v of verdicts) {
    let found = false;
    for (const catNode of cats?.items ?? []) {
      const subs = catNode.get("sub_criteria") as any;
      for (const subNode of subs?.items ?? []) {
        if (String(subNode.get("id")) !== v.subId) continue;
        const ev = (subNode.get("evidence") as any)?.items?.[0];
        if (!ev) continue;
        const statusNode = ev.get("verification_status", true) as Scalar | undefined;
        if (!statusNode?.range) continue;
        const statusLine = lineOf(raw, statusNode.range[0]);
        const indent = leadingSpaces(raw.split("\n")[statusLine]);
        edits.push({ statusLine, indent, lines: blockLines(v, indent) });
        found = true;
      }
    }
    if (!found) process.stderr.write(`  ⚠ ${slug}:${v.subId} not found — skipped\n`);
  }
  if (!edits.length) return 0;

  // Apply bottom-up so line indices stay valid as we splice.
  const lines = raw.split("\n");
  edits.sort((a, b) => b.statusLine - a.statusLine);
  for (const e of edits) {
    // Remove an existing fact_check block (idempotent re-runs / updates).
    let insertAt = e.statusLine + 1;
    if (
      insertAt < lines.length &&
      lines[insertAt].trim() === "fact_check:" &&
      leadingSpaces(lines[insertAt]) === e.indent
    ) {
      let end = insertAt + 1;
      while (end < lines.length && (lines[end].trim() === "" || leadingSpaces(lines[end]) > e.indent)) {
        end++;
      }
      lines.splice(insertAt, end - insertAt); // drop old block
    }
    lines.splice(insertAt, 0, ...e.lines);
  }

  const next = lines.join("\n");
  if (!dryRun) fs.writeFileSync(filePath, next);
  return edits.length;
}

function main() {
  const inPath = readFlag("in");
  if (!inPath) {
    process.stderr.write("error: --in <verdicts.json> required\n");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const verdicts: Verdict[] = JSON.parse(fs.readFileSync(inPath, "utf-8"));

  const bySlug = new Map<string, Verdict[]>();
  for (const v of verdicts) {
    (bySlug.get(v.slug) ?? bySlug.set(v.slug, []).get(v.slug)!).push(v);
  }

  let total = 0;
  for (const [slug, vs] of bySlug) {
    const n = processFile(slug, vs, dryRun);
    total += n;
    process.stderr.write(`  ${dryRun ? "[dry] " : ""}${slug}: ${n} fact_check block(s)\n`);
  }
  process.stderr.write(`${dryRun ? "DRY RUN — " : ""}wrote ${total} fact_check block(s) across ${bySlug.size} file(s)\n`);
}

main();
