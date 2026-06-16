// Single source of truth for the 9 lens presets (default + 8 alternatives).
//
// Imported by:
//   - lib/rankings.ts — uses LENS_WEIGHTS for in-process ranking computation
//   - db/seed.ts      — uses LENS_PRESETS to seed lens metadata + weight rows
//
// Keep this file free of runtime dependencies (no Prisma, no DB) so it can be
// loaded by the seed script, by Next.js, and by unit tests without pulling in
// the database client.

// v1.3 weight vectors (Workstream C revisions applied). Each lens sums to 100
// across 13 categories.
export const LENS_WEIGHTS = {
  default: { 1: 9, 2: 11, 3: 9, 4: 8, 5: 9, 6: 6, 7: 9, 8: 8, 9: 8, 10: 7, 11: 4, 12: 6, 13: 6 },
  progressive: { 1: 9, 2: 9, 3: 14, 4: 7, 5: 14, 6: 11, 7: 7, 8: 5, 9: 7, 10: 3, 11: 1, 12: 1, 13: 12 },
  classical_liberal: { 1: 11, 2: 9, 3: 9, 4: 15, 5: 5, 6: 4, 7: 7, 8: 11, 9: 11, 10: 5, 11: 2, 12: 2, 13: 9 },
  conservative: { 1: 13, 2: 13, 3: 5, 4: 7, 5: 5, 6: 4, 7: 10, 8: 10, 9: 5, 10: 7, 11: 7, 12: 3, 13: 11 },
  libertarian: { 1: 13, 2: 7, 3: 7, 4: 19, 5: 3, 6: 4, 7: 7, 8: 13, 9: 11, 10: 3, 11: 1, 12: 2, 13: 10 },
  communitarian: { 1: 7, 2: 7, 3: 7, 4: 5, 5: 11, 6: 7, 7: 7, 8: 9, 9: 7, 10: 7, 11: 7, 12: 7, 13: 12 },
  realist: { 1: 9, 2: 21, 3: 6, 4: 6, 5: 6, 6: 4, 7: 15, 8: 7, 9: 6, 10: 13, 11: 1, 12: 1, 13: 5 },
  populist: { 1: 13, 2: 7, 3: 6, 4: 6, 5: 13, 6: 3, 7: 9, 8: 4, 9: 6, 10: 6, 11: 2, 12: 11, 13: 14 },
  internationalist: { 1: 6, 2: 13, 3: 8, 4: 8, 5: 6, 6: 11, 7: 8, 8: 8, 9: 8, 10: 6, 11: 2, 12: 8, 13: 8 },
} as const;

export type LensSlug = keyof typeof LENS_WEIGHTS;
export type CategoryWeights = Record<number, number>;

// Validate at module load — fail fast if weights are miscalibrated.
for (const [lens, weights] of Object.entries(LENS_WEIGHTS)) {
  const sum = Object.values(weights).reduce((s, w) => s + w, 0);
  if (sum !== 100) {
    throw new Error(`Lens ${lens} weights sum to ${sum}, not 100`);
  }
}

export interface LensPreset {
  slug: LensSlug;
  displayName: string;
  description: string;
  orderIndex: number;
  weights: Record<number, number>;
}

export const LENS_PRESETS: LensPreset[] = [
  {
    slug: "default",
    displayName: "Default (expert blend)",
    orderIndex: 0,
    description:
      "Blended from published methodologies (C-SPAN, APSA, Siena, Brookings/UVA). The default ranking.",
    weights: LENS_WEIGHTS.default,
  },
  {
    slug: "progressive",
    displayName: "Progressive",
    orderIndex: 1,
    description:
      "Civil rights, welfare, environment, and immigration lead. Decorum and populace mood given little weight; structural outcomes matter more than tone.",
    weights: LENS_WEIGHTS.progressive,
  },
  {
    slug: "classical_liberal",
    displayName: "Classical Liberal",
    orderIndex: 2,
    description:
      "Civil liberties, rule of law, institutional integrity lead. Skeptical of executive expansion. Tradition: Locke, Mill, Hayek.",
    weights: LENS_WEIGHTS.classical_liberal,
  },
  {
    slug: "conservative",
    displayName: "Conservative",
    orderIndex: 3,
    description:
      "Foreign policy strength, economic growth, decorum, institutional integrity lead. Tradition: Burke, Kirk, Buckley. Immigration enforcement weighted heavily. v1.3: Cat 8 9%→10%.",
    weights: LENS_WEIGHTS.conservative,
  },
  {
    slug: "libertarian",
    displayName: "Libertarian",
    orderIndex: 4,
    description:
      "Civil liberties dominant. Foreign-policy restraint, fiscal discipline, institutional integrity highly weighted. The 13% on Institutional Integrity reflects Hayekian rule-of-law-as-liberty-foundation, not Rothbardian anti-state.",
    weights: LENS_WEIGHTS.libertarian,
  },
  {
    slug: "communitarian",
    displayName: "Communitarian",
    orderIndex: 5,
    description:
      "Welfare, social cohesion, institutional integrity, and decorum lead. Tradition: Etzioni, MacIntyre, Sandel, Putnam.",
    weights: LENS_WEIGHTS.communitarian,
  },
  {
    slug: "realist",
    displayName: "Realist",
    orderIndex: 6,
    description:
      "Foreign policy, crisis management, long-tail consequences dominate. Tradition: Morgenthau, Kennan, Mearsheimer. Substantially discounts decorum, populace mood, and rights-talk.",
    weights: LENS_WEIGHTS.realist,
  },
  {
    slug: "populist",
    displayName: "Populist",
    orderIndex: 7,
    description:
      "Anti-elite framing; emphasizes economic and welfare delivery to working/middle-class citizens; immigration enforcement weighted very high. Composite of left- and right-populist traditions.",
    weights: LENS_WEIGHTS.populist,
  },
  {
    slug: "internationalist",
    displayName: "Internationalist",
    orderIndex: 8,
    description:
      "Liberal internationalism / multilateralism. Heavy weight on foreign policy, environment (multilateral climate), international standing. Tradition: Wilson, Acheson, Brookings/CFR mainstream. v1.3: Cat 2 15%→13%, Cat 10 4%→6%.",
    weights: LENS_WEIGHTS.internationalist,
  },
];
