// Structural validation of every scores/*.yaml against the zod contract in
// lib/score-schema.ts. Runs in the existing CI `node` job (pnpm test). Catches
// typo'd keys, bad enum values, malformed source_urls, and any sub-criterion
// that grows a second evidence entry (which would break the verify-urls.ts
// write-back key).

import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { presidentScoreSchema } from "../score-schema";

const PRESIDENT_SLUGS = [
  "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
  "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
  "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
  "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
];

function loadRaw(slug: string): unknown {
  const filePath = path.resolve(__dirname, "..", "..", "scores", `${slug}.yaml`);
  return yaml.parse(fs.readFileSync(filePath, "utf-8"));
}

describe("scores/*.yaml structural validation", () => {
  it.each(PRESIDENT_SLUGS)("%s validates against the schema", (slug) => {
    const result = presidentScoreSchema.safeParse(loadRaw(slug));
    if (!result.success) {
      // Surface the exact path + message so a CI failure is actionable.
      const issues = result.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`${slug}.yaml failed schema validation:\n${issues}`);
    }
    expect(result.success).toBe(true);
  });

  it("every sub-criterion has at most one evidence entry (write-back invariant)", () => {
    const offenders: string[] = [];
    for (const slug of PRESIDENT_SLUGS) {
      const data = loadRaw(slug) as {
        categories: { sub_criteria: { id: string; evidence?: unknown[] }[] }[];
      };
      for (const cat of data.categories) {
        for (const sub of cat.sub_criteria) {
          if (Array.isArray(sub.evidence) && sub.evidence.length > 1) {
            offenders.push(`${slug}:${sub.id} (${sub.evidence.length})`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("sub-criterion ids are unique within each file (write-back key)", () => {
    const collisions: string[] = [];
    for (const slug of PRESIDENT_SLUGS) {
      const data = loadRaw(slug) as {
        categories: { sub_criteria: { id: string }[] }[];
      };
      const seen = new Set<string>();
      for (const cat of data.categories) {
        for (const sub of cat.sub_criteria) {
          if (seen.has(sub.id)) collisions.push(`${slug}:${sub.id}`);
          seen.add(sub.id);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});
