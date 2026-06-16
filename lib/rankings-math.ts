// Pure ranking math — extracted from lib/rankings.ts so tests can import it
// without instantiating the Prisma client at module load. Keep this file free
// of runtime dependencies.

import type { CategoryWeights } from "./lens-presets";

export type CategoryNets = Record<number, number | null>;

/**
 * Compute category nets for a single president.
 * Per v1.2 §4.2: category_net = mean(sub-criterion nets in that category).
 * Skip null good/harm scores (insufficient_time_elapsed or N/A 0/0 era entries).
 * Returns null for categories with no scorable sub-criteria.
 */
export function computeCategoryNets(
  scores: Array<{
    goodScore: number | null;
    harmScore: number | null;
    subCriterion: { categoryId: string; category: { number: number } };
  }>
): CategoryNets {
  const buckets: Record<number, number[]> = {};

  for (const score of scores) {
    const { goodScore, harmScore } = score;
    if (goodScore === null || harmScore === null) continue;
    if (goodScore === 0 && harmScore === 0) continue; // era-N/A entries

    const catNum = score.subCriterion.category.number;
    if (!buckets[catNum]) buckets[catNum] = [];
    buckets[catNum].push(goodScore - harmScore);
  }

  const nets: CategoryNets = {};
  for (let i = 1; i <= 13; i++) {
    const bucket = buckets[i];
    nets[i] = bucket && bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : null;
  }
  return nets;
}

/**
 * Apply a weight vector to category nets, handling Cat 10 drops with
 * proportional renormalization per v1.2 §9.4.
 */
export function computeWeightedTotal(
  categoryNets: CategoryNets,
  weights: CategoryWeights
): number {
  const scoredCats = Object.entries(categoryNets)
    .filter(([_, net]) => net !== null)
    .map(([cat, net]) => ({ cat: parseInt(cat), net: net as number }));

  if (scoredCats.length === 0) return 0;

  const usedWeight = scoredCats.reduce((sum, { cat }) => sum + weights[cat], 0);
  const scale = 100 / usedWeight;

  return scoredCats.reduce(
    (total, { cat, net }) => total + (net * weights[cat] * scale) / 100,
    0
  );
}
