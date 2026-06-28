// Track B — build the factual-verification work-list from scores/*.yaml.
//
// Emits one record per evidence entry with everything an agent needs to verify
// the claim against its source, plus leverage tags so we can run highest-stakes
// items first. Read-only; writes a JSON work-list to the path given by --out
// (default: scratchpad). Prints a priority breakdown.
//
// Usage:
//   pnpm tsx scripts/factcheck-build-worklist.ts --out /tmp/worklist.json
//   pnpm tsx scripts/factcheck-build-worklist.ts --priority P0   # filter

import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const SCORES_DIR = path.resolve(__dirname, "..", "scores");
const ALL_SLUGS = [
  "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
  "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
  "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
  "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
];

// Living as of the project's current date (2026-06-27): Clinton, G.W. Bush,
// Obama, Biden, Trump. (Carter d. 2024; G.H.W. Bush d. 2018.) Legal exposure
// (DISCLAIMER.md) is highest for harm claims about living subjects.
const LIVING = new Set([
  "bill_clinton", "george_w_bush", "barack_obama", "joe_biden",
  "donald_trump_t1", "donald_trump_t2",
]);

export interface WorkItem {
  slug: string;
  display: string;
  subId: string;
  subName: string;
  categoryName: string;
  direction: string;
  good: number | null;
  harm: number | null;
  claim: string;
  citation: string | null;
  sourceUrl: string;
  verificationStatus: string;
  eraContext: string | null;
  notes: string | null;
  // leverage tags
  living: boolean;
  anchor: boolean;
  highHarm: boolean; // harm >= 8
  shallowUrl: boolean; // bare homepage — agent should suggest a deep link
  priority: "P0" | "P1" | "P2";
}

function isShallow(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.pathname.split("/").filter(Boolean).length === 0;
  } catch {
    return false;
  }
}

function build(): WorkItem[] {
  const items: WorkItem[] = [];
  for (const slug of ALL_SLUGS) {
    const data = yaml.parse(fs.readFileSync(path.join(SCORES_DIR, `${slug}.yaml`), "utf-8"));
    const anchor = data.calibration_anchor === true;
    const living = LIVING.has(slug);
    for (const cat of data.categories) {
      for (const sub of cat.sub_criteria) {
        const ev = (sub.evidence ?? [])[0];
        if (!ev) continue;
        const harm: number | null = sub.harm_score ?? null;
        const highHarm = harm !== null && harm >= 8;
        const shallowUrl = isShallow(String(ev.source_url ?? ""));
        // Leverage-first priority:
        //   P0 = strongest harm claims + anything about living subjects + anchors
        //   P1 = remaining tier-1-ish substantive claims
        //   P2 = era-N/A-adjacent / pure-opinion (handled last)
        let priority: WorkItem["priority"] = "P1";
        if (highHarm || (living && harm !== null && harm >= 6) || anchor) priority = "P0";
        items.push({
          slug,
          display: data.display_name,
          subId: sub.id,
          subName: sub.name,
          categoryName: cat.name,
          direction: ev.direction,
          good: sub.good_score ?? null,
          harm,
          claim: ev.claim,
          citation: ev.citation ?? null,
          sourceUrl: ev.source_url,
          verificationStatus: ev.verification_status,
          eraContext: sub.era_context ?? null,
          notes: sub.notes ?? null,
          living,
          anchor,
          highHarm,
          shallowUrl,
          priority,
        });
      }
    }
  }
  return items;
}

function readFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}

function main() {
  let items = build();
  const filter = readFlag("priority");
  if (filter) items = items.filter((i) => i.priority === filter);

  const out = readFlag("out") ?? "/tmp/factcheck-worklist.json";
  fs.writeFileSync(out, JSON.stringify(items, null, 2));

  const by = (pred: (i: WorkItem) => boolean) => items.filter(pred).length;
  const all = build();
  process.stderr.write(
    `Work-list written to ${out}\n` +
      `  total evidence:        ${all.length}\n` +
      `  P0 (run first):        ${by((i) => i.priority === "P0")}  ` +
      `[highHarm ${all.filter((i) => i.highHarm).length}, ` +
      `living ${all.filter((i) => i.living).length}, anchor ${all.filter((i) => i.anchor).length}]\n` +
      `  P1:                    ${all.filter((i) => i.priority === "P1").length}\n` +
      `  high-harm (harm>=8):   ${all.filter((i) => i.highHarm).length}\n` +
      `  shallow-url remediation: ${all.filter((i) => i.shallowUrl).length}\n` +
      (filter ? `  (filtered to ${filter}: ${items.length})\n` : "")
  );
}

main();
