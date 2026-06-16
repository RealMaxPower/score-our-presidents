// Lens-weighted ranking computation
// TypeScript port of compute_rankings.py
// Apply weight vectors to category nets with Cat 10 proportional renormalization per v1.2 §9.4

import { prisma } from "./prisma";
import {
  LENS_WEIGHTS,
  type CategoryWeights,
  type LensSlug,
} from "./lens-presets";
import {
  computeCategoryNets,
  computeWeightedTotal,
  type CategoryNets,
} from "./rankings-math";

// Re-export so existing imports from "@/lib/rankings" continue to resolve.
export { LENS_WEIGHTS, computeCategoryNets, computeWeightedTotal };
export type { CategoryWeights, LensSlug, CategoryNets };

// Short display labels for the home-page impact bar (per The Ledger design notes).
// Database stores full names like "Foreign policy & war"; this maps to the
// uppercase magazine-style short form used under bar segments.
export const CATEGORY_SHORT_LABELS: Record<number, string> = {
  1: "ECONOMY",
  2: "FOREIGN POLICY",
  3: "CIVIL RIGHTS",
  4: "CIVIL LIBERTIES",
  5: "WELFARE",
  6: "ENVIRONMENT",
  7: "CRISIS MGMT",
  8: "INSTITUTIONS",
  9: "DEMOCRACY",
  10: "LONG-TAIL",
  11: "DECORUM",
  12: "POPULACE",
  13: "IMMIGRATION",
};

// One-line category descriptions used on the methodology page.
// Source-of-truth for category names is the DB (seeded from spec v1.2);
// descriptions are not seeded, so they live in code.
export const CATEGORY_DESCRIPTIONS: Record<number, string> = {
  1: "Growth, employment, inequality, fiscal trajectory, and worker conditions during and attributable to the administration.",
  2: "Decisions on war and peace, alliance management, diplomacy and soft power, and the civilian cost of military action.",
  3: "Racial, gender, LGBTQ+, disability, and tribal/indigenous rights advanced or rolled back.",
  4: "Press freedom posture, surveillance, executive restraint, transparency, and treatment of dissent.",
  5: "Healthcare access, education, the social safety net, and the cost and availability of housing.",
  6: "Climate posture, air and water regulation, public-lands stewardship, and biodiversity protection.",
  7: "Speed and effectiveness of response to crises, honesty with the public during them, and long-term resolution.",
  8: "Adherence to constitutional, statutory, and norm-based limits on the presidency; staffing of independent institutions.",
  9: "Defense or erosion of free and fair elections, peaceful transfer of power, and the rule of law over partisan ends.",
  10: "Effects that ripen years after the term ends — policies, appointments, and precedents whose impact unfolds over time.",
  11: "Personal and rhetorical conduct in office; respect (or disrespect) for the dignity of the office itself.",
  12: "Felt impact on the American population — economic security, civic morale, sense of national direction.",
  13: "Legal immigration policy, treatment of unauthorized migrants and asylum-seekers, and demographic/labor effects.",
};

export interface PresidentRanking {
  presidentId: string;
  slug: string;
  displayName: string;
  party: string;
  termStart: Date;
  termEnd: Date | null;
  weightedTotal: number;
  catTenDropped: boolean;
  // 0–10 average across scorable sub-criteria — drives bar segment widths
  meanGood: number;
  meanHarm: number;
  // Top 2 contributing categories per direction — drives bar labels
  topGoodLabels: string[];
  topHarmLabels: string[];
}

type PresidentWithScores = Awaited<
  ReturnType<typeof fetchPresidentsWithScores>
>[number];

/**
 * Pick up to 2 category short-labels. Drains the primary list first (the
 * "interesting" categories — net-positive or net-negative contributions to
 * the weighted total) then tops up from the fallback list (highest absolute
 * mean × weight) so labels are never empty.
 */
function pickTwoLabels(
  primaryCatNumbers: number[],
  fallbackCatNumbers: number[]
): string[] {
  const chosen: number[] = [];
  for (const num of primaryCatNumbers) {
    if (chosen.length >= 2) break;
    if (!chosen.includes(num)) chosen.push(num);
  }
  for (const num of fallbackCatNumbers) {
    if (chosen.length >= 2) break;
    if (!chosen.includes(num)) chosen.push(num);
  }
  return chosen.map((n) => CATEGORY_SHORT_LABELS[n]);
}

async function fetchPresidentsWithScores() {
  return prisma.president.findMany({
    orderBy: { orderIndex: "asc" },
    include: {
      expertScores: {
        include: {
          subCriterion: {
            include: { category: true },
          },
        },
      },
    },
  });
}

function rankPresidentsForLens(
  presidents: PresidentWithScores[],
  weights: CategoryWeights
): PresidentRanking[] {
  const rankings: PresidentRanking[] = presidents.map((p) => {
    const nets = computeCategoryNets(p.expertScores);
    const weightedTotal = computeWeightedTotal(nets, weights);
    const catTenDropped = nets[10] === null;

    const perCat: Record<number, { good: number[]; harm: number[] }> = {};
    let allGood = 0;
    let allHarm = 0;
    let n = 0;
    for (const s of p.expertScores) {
      if (s.goodScore === null || s.harmScore === null) continue;
      if (s.goodScore === 0 && s.harmScore === 0) continue;
      const catNum = s.subCriterion.category.number;
      if (!perCat[catNum]) perCat[catNum] = { good: [], harm: [] };
      perCat[catNum].good.push(s.goodScore);
      perCat[catNum].harm.push(s.harmScore);
      allGood += s.goodScore;
      allHarm += s.harmScore;
      n += 1;
    }
    const meanGood = n > 0 ? allGood / n : 0;
    const meanHarm = n > 0 ? allHarm / n : 0;

    // Rank labels by *weighted contribution to the weighted total*
    // (`net × weight`), not raw signed net. Raw net causes low-weight
    // categories like Decorum (weight 4) to dominate positive labels for
    // every president who avoided scandal — weighting by importance surfaces
    // the categories actually moving each president's score.
    const catContributions: { num: number; contrib: number }[] = [];
    const catMeans: { num: number; goodWeighted: number; harmWeighted: number }[] = [];
    for (let c = 1; c <= 13; c++) {
      const net = nets[c];
      if (net === null) continue;
      catContributions.push({ num: c, contrib: net * weights[c] });
      const bucket = perCat[c];
      if (bucket && bucket.good.length > 0) {
        const mg = bucket.good.reduce((a, b) => a + b, 0) / bucket.good.length;
        const mh = bucket.harm.reduce((a, b) => a + b, 0) / bucket.harm.length;
        catMeans.push({
          num: c,
          goodWeighted: mg * weights[c],
          harmWeighted: mh * weights[c],
        });
      }
    }

    // Primary: net-positive contributions (where this president net-won).
    // Fallback when fewer than 2: highest mean(good) × weight so labels are
    // never empty — for clean presidents this surfaces "areas of strength"
    // rather than "areas of net win."
    const topGoodLabels = pickTwoLabels(
      catContributions
        .filter((c) => c.contrib > 0)
        .sort((a, b) => b.contrib - a.contrib)
        .map((c) => c.num),
      catMeans
        .slice()
        .sort((a, b) => b.goodWeighted - a.goodWeighted)
        .map((c) => c.num)
    );
    const topHarmLabels = pickTwoLabels(
      catContributions
        .filter((c) => c.contrib < 0)
        .sort((a, b) => a.contrib - b.contrib)
        .map((c) => c.num),
      catMeans
        .slice()
        .sort((a, b) => b.harmWeighted - a.harmWeighted)
        .map((c) => c.num)
    );

    return {
      presidentId: p.id,
      slug: p.slug,
      displayName: p.displayName,
      party: p.party,
      termStart: p.termStart,
      termEnd: p.termEnd,
      weightedTotal,
      catTenDropped,
      meanGood,
      meanHarm,
      topGoodLabels,
      topHarmLabels,
    };
  });

  rankings.sort((a, b) => b.weightedTotal - a.weightedTotal);
  return rankings;
}

/**
 * Compute full ranking under a given lens by fetching all 16 presidents and
 * their expert scores in one query, then computing category nets + weighted totals.
 */
export async function getRankingsByLens(
  lens: LensSlug
): Promise<PresidentRanking[]> {
  const weights = LENS_WEIGHTS[lens] as unknown as CategoryWeights;
  const presidents = await fetchPresidentsWithScores();
  return rankPresidentsForLens(presidents, weights);
}

/**
 * Compute rankings for all 9 lenses in one DB roundtrip. Used by the home
 * page so lens chip clicks can switch instantly without a server fetch.
 */
export async function getAllLensRankings(): Promise<
  Record<LensSlug, PresidentRanking[]>
> {
  const presidents = await fetchPresidentsWithScores();
  const out = {} as Record<LensSlug, PresidentRanking[]>;
  for (const lens of Object.keys(LENS_WEIGHTS) as LensSlug[]) {
    const weights = LENS_WEIGHTS[lens] as unknown as CategoryWeights;
    out[lens] = rankPresidentsForLens(presidents, weights);
  }
  return out;
}

/**
 * Same data shape as a single lens entry in `getAllLensRankings`, but driven
 * by an arbitrary weight vector (e.g. a user's personal weights). Lets the
 * home page render a "Yours" lens alongside the 9 canonical presets.
 */
export async function getRankingsForCustomWeights(
  weights: CategoryWeights
): Promise<PresidentRanking[]> {
  const presidents = await fetchPresidentsWithScores();
  return rankPresidentsForLens(presidents, weights);
}

/**
 * Lightweight per-president snapshot for the personal-weights editor.
 * The client computes ranking previews directly from `categoryNets` +
 * the user's current slider values, so no server roundtrip is needed
 * while the user drags.
 */
export interface PresidentNets {
  presidentId: string;
  slug: string;
  displayName: string;
  party: string;
  termStart: string;
  termEnd: string | null;
  catTenDropped: boolean;
  categoryNets: Record<number, number | null>;
}

export async function getPresidentCategoryNets(): Promise<PresidentNets[]> {
  const presidents = await fetchPresidentsWithScores();
  return presidents.map((p) => {
    const nets = computeCategoryNets(p.expertScores);
    return {
      presidentId: p.id,
      slug: p.slug,
      displayName: p.displayName,
      party: p.party,
      termStart: p.termStart.toISOString(),
      termEnd: p.termEnd ? p.termEnd.toISOString() : null,
      catTenDropped: nets[10] === null,
      categoryNets: nets,
    };
  });
}
