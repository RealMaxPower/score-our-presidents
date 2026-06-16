// Ranking-math correctness tests.
//
// Covers what the markdown rankings and the home page actually consume:
//   1. Each lens vector sums to 100 (was a runtime check; now a unit test too).
//   2. Cat 10 drop + proportional renormalization (v1.2 §9.4) is correct.
//   3. Era-N/A sub-criteria (good=0, harm=0) are excluded from category nets.
//   4. Regression snapshot: all 16 presidents under all 9 lenses, computed
//      from the seed YAMLs. Future drift in the math (or a stray weight
//      revision) fails the snapshot and forces a deliberate update.

import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { LENS_WEIGHTS, type CategoryWeights } from "../lens-presets";
import {
  computeCategoryNets,
  computeWeightedTotal,
} from "../rankings-math";

// Build a score shape that matches what computeCategoryNets expects from
// Prisma (good/harm + nested category.number). Skips the DB entirely.
type ScoreInput = Parameters<typeof computeCategoryNets>[0][number];
function score(
  categoryNumber: number,
  goodScore: number | null,
  harmScore: number | null
): ScoreInput {
  return {
    goodScore,
    harmScore,
    subCriterion: {
      categoryId: `cat-${categoryNumber}`,
      category: { number: categoryNumber },
    },
  };
}

describe("LENS_WEIGHTS", () => {
  it("every lens sums to 100", () => {
    for (const [lens, weights] of Object.entries(LENS_WEIGHTS)) {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum, `${lens} should sum to 100`).toBe(100);
    }
  });

  it("covers all 13 categories on every lens", () => {
    for (const [lens, weights] of Object.entries(LENS_WEIGHTS)) {
      for (let c = 1; c <= 13; c++) {
        expect(
          (weights as Record<number, number>)[c],
          `${lens} missing weight for category ${c}`
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("computeCategoryNets", () => {
  it("averages sub-criterion nets within each category", () => {
    // Cat 1: nets 6 and 2 → mean 4. Cat 2: net 0.
    const nets = computeCategoryNets([
      score(1, 8, 2),
      score(1, 4, 2),
      score(2, 5, 5),
    ]);
    expect(nets[1]).toBe(4);
    expect(nets[2]).toBe(0);
  });

  it("excludes era-N/A (0/0) sub-criteria from the average", () => {
    // 0/0 entry shouldn't drag the mean toward zero.
    const withEraNa = computeCategoryNets([
      score(3, 7, 1), // net +6
      score(3, 0, 0), // era N/A — excluded
    ]);
    const withoutEraNa = computeCategoryNets([score(3, 7, 1)]);
    expect(withEraNa[3]).toBe(6);
    expect(withEraNa[3]).toBe(withoutEraNa[3]);
  });

  it("returns null for categories with no scorable sub-criteria", () => {
    const nets = computeCategoryNets([
      score(1, 5, 5),
      score(10, null, null), // dropped (insufficient time elapsed)
      score(10, 0, 0), // era N/A
    ]);
    expect(nets[1]).toBe(0);
    expect(nets[10]).toBeNull();
  });

  it("treats null good or harm scores as unscored", () => {
    const nets = computeCategoryNets([
      score(4, 6, 2), // counted: net +4
      score(4, null, 3), // skipped
      score(4, 5, null), // skipped
    ]);
    expect(nets[4]).toBe(4);
  });
});

describe("computeWeightedTotal (Cat 10 renormalization)", () => {
  // All cats net to the same value: dropping Cat 10 should yield an identical
  // weighted total. This is the v1.2 §9.4 "proportional renormalization"
  // invariant — the rest of the cats are scaled up by 100/(100 - w10) so the
  // result still represents a 0–10 weighted mean.
  const flatNets: Record<number, number | null> = {
    1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5,
  };

  it("Cat 10 present at the same net as everything else == same total as Cat 10 dropped", () => {
    const w = LENS_WEIGHTS.default as unknown as CategoryWeights;
    const withCat10 = computeWeightedTotal(flatNets, w);
    const withoutCat10 = computeWeightedTotal({ ...flatNets, 10: null }, w);
    expect(withCat10).toBeCloseTo(5, 10);
    expect(withoutCat10).toBeCloseTo(5, 10);
  });

  it("renormalizes proportionally — dropping Cat 10 redistributes its weight", () => {
    // Make Cat 10 an outlier. With Cat 10 included its +10 pulls the total up;
    // dropping it should pull the weighted total down toward the mean of the
    // remaining 12 cats (which is 0 here).
    const skewed: Record<number, number | null> = { ...flatNets };
    for (let c = 1; c <= 13; c++) skewed[c] = 0;
    skewed[10] = 10;

    const w = LENS_WEIGHTS.default as unknown as CategoryWeights;
    const withCat10 = computeWeightedTotal(skewed, w);
    const withoutCat10 = computeWeightedTotal({ ...skewed, 10: null }, w);

    // Default Cat 10 weight is 7; total ≈ 10 × 7/100 = 0.70 with Cat 10.
    expect(withCat10).toBeCloseTo(0.7, 10);
    // Without Cat 10, the remaining cats all net 0 so total is 0.
    expect(withoutCat10).toBe(0);
  });

  it("returns 0 when no categories are scored", () => {
    const allNull: Record<number, number | null> = {};
    for (let c = 1; c <= 13; c++) allNull[c] = null;
    expect(
      computeWeightedTotal(allNull, LENS_WEIGHTS.default as unknown as CategoryWeights)
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Regression snapshot — all 16 presidents × 9 lenses, computed from YAMLs.
// ---------------------------------------------------------------------------

const PRESIDENT_SLUGS = [
  "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
  "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
  "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
  "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
];

function loadScoresFromYaml(slug: string): ScoreInput[] {
  const filePath = path.resolve(__dirname, "..", "..", "scores", `${slug}.yaml`);
  const raw = yaml.parse(fs.readFileSync(filePath, "utf-8"));
  const scores: ScoreInput[] = [];
  for (const cat of raw.categories) {
    for (const sub of cat.sub_criteria) {
      scores.push(
        score(
          cat.category as number,
          sub.good_score ?? null,
          sub.harm_score ?? null
        )
      );
    }
  }
  return scores;
}

describe("16 × 9 ranking snapshot (loaded from scores/*.yaml)", () => {
  it("matches the locked snapshot of weighted totals", () => {
    const out: Record<string, Record<string, number>> = {};
    for (const slug of PRESIDENT_SLUGS) {
      const scores = loadScoresFromYaml(slug);
      const nets = computeCategoryNets(scores);
      const byLens: Record<string, number> = {};
      for (const lens of Object.keys(LENS_WEIGHTS) as Array<keyof typeof LENS_WEIGHTS>) {
        const weights = LENS_WEIGHTS[lens] as unknown as CategoryWeights;
        byLens[lens] = Number(computeWeightedTotal(nets, weights).toFixed(4));
      }
      out[slug] = byLens;
    }
    expect(out).toMatchSnapshot();
  });
});
