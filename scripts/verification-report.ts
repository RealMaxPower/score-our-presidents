// Verification status report — reads scores/*.yaml (the source of truth, NOT
// the DB) and prints coverage for BOTH dimensions:
//   - URL liveness  (verification_status: pending | verified | shallow | failed | not_applicable)
//   - Factual check (fact_check.status: supported | partial | unsupported | cant_verify | <none>)
//
// Read-only. Usage:
//   pnpm tsx scripts/verification-report.ts            # print to stdout
//   pnpm tsx scripts/verification-report.ts --write     # also write docs/verification-status.md
//
// The point of this script: "I thought it was all verified" should never be a
// surprise again. Note that a `verified` URL means only that the link resolves
// — `shallow` (a bare homepage that 2xx'd) and the fact_check column are the
// signals that actually bear on credibility.

import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { presidentScoreSchema, VERIFICATION_STATUSES } from "../lib/score-schema";
import { urlDepth } from "../lib/url-liveness";

const PRESIDENT_SLUGS = [
  "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
  "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
  "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
  "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
];

const SCORES_DIR = path.resolve(__dirname, "..", "scores");
const VSTATUSES = VERIFICATION_STATUSES; // pending | verified | shallow | failed | not_applicable
const FCSTATUSES = ["supported", "partial", "unsupported", "cant_verify", "unreviewed"] as const;

interface Row {
  slug: string;
  display: string;
  total: number;
  liveness: Record<string, number>;
  fact: Record<string, number>;
  fetchable: number;
  canonical: number;
  shallowUrls: number; // fetchable URLs that are bare origins (liveness ~meaningless)
}

function emptyCounts(keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function analyze(slug: string): Row {
  const filePath = path.join(SCORES_DIR, `${slug}.yaml`);
  const data = presidentScoreSchema.parse(yaml.parse(fs.readFileSync(filePath, "utf-8")));
  const row: Row = {
    slug,
    display: data.display_name,
    total: 0,
    liveness: emptyCounts(VSTATUSES),
    fact: emptyCounts(FCSTATUSES),
    fetchable: 0,
    canonical: 0,
    shallowUrls: 0,
  };
  for (const cat of data.categories) {
    for (const sub of cat.sub_criteria) {
      for (const ev of sub.evidence ?? []) {
        row.total += 1;
        row.liveness[ev.verification_status] += 1;
        row.fact[ev.fact_check?.status ?? "unreviewed"] += 1;
        if (ev.source_url === "canonical") {
          row.canonical += 1;
        } else {
          row.fetchable += 1;
          if (urlDepth(ev.source_url) === 0) row.shallowUrls += 1;
        }
      }
    }
  }
  return row;
}

function pct(n: number, d: number): string {
  return d === 0 ? "  -  " : `${((100 * n) / d).toFixed(0).padStart(3)}%`;
}

function render(rows: Row[]): string {
  const totals: Row = {
    slug: "TOTAL", display: "TOTAL", total: 0,
    liveness: emptyCounts(VSTATUSES), fact: emptyCounts(FCSTATUSES),
    fetchable: 0, canonical: 0, shallowUrls: 0,
  };
  for (const r of rows) {
    totals.total += r.total;
    totals.fetchable += r.fetchable;
    totals.canonical += r.canonical;
    totals.shallowUrls += r.shallowUrls;
    for (const k of VSTATUSES) totals.liveness[k] += r.liveness[k];
    for (const k of FCSTATUSES) totals.fact[k] += r.fact[k];
  }

  const lines: string[] = [];
  lines.push("# Evidence verification status");
  lines.push("");
  lines.push("Two independent dimensions. **URL liveness** only means the link resolves;");
  lines.push("**fact-check** is whether the source supports the claim. A `verified` link on a");
  lines.push("bare homepage (`shallow`) tells you almost nothing — those are flagged below.");
  lines.push("");
  lines.push(`- Evidence entries: **${totals.total}**  (fetchable URLs ${totals.fetchable}, canonical ${totals.canonical})`);
  lines.push(`- URL liveness: ${VSTATUSES.map((s) => `${s} ${totals.liveness[s]}`).join(" · ")}`);
  lines.push(`- Fact-check: ${FCSTATUSES.map((s) => `${s} ${totals.fact[s]}`).join(" · ")}`);
  lines.push(`- Shallow (bare-homepage) URLs needing deep links: **${totals.shallowUrls}**`);
  lines.push("");

  // URL liveness table
  lines.push("## URL liveness by president");
  lines.push("");
  lines.push("| President | total | pending | verified | shallow | failed | n/a | %live |");
  lines.push("|---|--:|--:|--:|--:|--:|--:|--:|");
  const livenessRow = (r: Row) => {
    const live = r.liveness.verified;
    const denom = r.fetchable; // canonical excluded from the resolve-rate denominator
    return `| ${r.display} | ${r.total} | ${r.liveness.pending} | ${r.liveness.verified} | ${r.liveness.shallow} | ${r.liveness.failed} | ${r.liveness.not_applicable} | ${pct(live, denom)} |`;
  };
  for (const r of rows) lines.push(livenessRow(r));
  lines.push(livenessRow(totals).replace(`| ${totals.display} |`, `| **TOTAL** |`));
  lines.push("");

  // Fact-check table
  lines.push("## Fact-check by president");
  lines.push("");
  lines.push("| President | total | unreviewed | supported | partial | unsupported | cant_verify | %checked |");
  lines.push("|---|--:|--:|--:|--:|--:|--:|--:|");
  const factRow = (r: Row) => {
    const checked = r.total - r.fact.unreviewed;
    return `| ${r.display} | ${r.total} | ${r.fact.unreviewed} | ${r.fact.supported} | ${r.fact.partial} | ${r.fact.unsupported} | ${r.fact.cant_verify} | ${pct(checked, r.total)} |`;
  };
  for (const r of rows) lines.push(factRow(r));
  lines.push(factRow(totals).replace(`| ${totals.display} |`, `| **TOTAL** |`));
  lines.push("");

  return lines.join("\n");
}

function main() {
  const rows = PRESIDENT_SLUGS.map(analyze);
  const out = render(rows);
  process.stdout.write(out + "\n");

  if (process.argv.includes("--write")) {
    const dest = path.resolve(__dirname, "..", "docs", "verification-status.md");
    fs.writeFileSync(dest, out + "\n");
    process.stderr.write(`\nWrote ${dest}\n`);
  }
}

main();
