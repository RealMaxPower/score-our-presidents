import { prisma } from "./prisma";
import {
  computeCategoryNets,
  computeWeightedTotal,
  LENS_WEIGHTS,
  type CategoryWeights,
} from "./rankings";

export interface EvidenceItem {
  sourceUrl: string | null;
  citation: string | null;
  sourceType: string;
  tier: number;
  claim: string;
  verbatimQuote: string | null;
  direction: string; // "good" | "harm"
  verificationStatus: string;
}

export interface SubCriterionRow {
  id: string; // UUID for vote targeting
  number: string;
  name: string;
  goodScore: number | null;
  harmScore: number | null;
  net: number | null;
  notes: string | null;
  lowConfidence: boolean;
  insufficientTimeElapsed: boolean;
  tentativeLongTail: boolean;
  scoreStatus: string | null;
  eraContext: string | null;
  evidenceCount: number;
  evidence: EvidenceItem[];
}

export interface CategoryBlock {
  id: string; // UUID for vote targeting
  number: number;
  name: string;
  description: string | null;
  defaultWeight: number;
  net: number | null;
  scorableSubCount: number;
  subCriteria: SubCriterionRow[];
}

export interface PresidentScorecard {
  id: string; // UUID for vote targeting
  slug: string;
  displayName: string;
  party: string;
  termStart: Date;
  termEnd: Date | null;
  termsServed: string;
  calibrationAnchor: boolean;
  anchorStatus: string | null;
  inOffice: boolean;
  catTenStatus: string;
  partialTermNote: string | null;
  weightedTotalDefault: number;
  catTenDropped: boolean;
  categories: CategoryBlock[];
}

function parseSubNumber(n: string): [number, number] {
  const [a, b] = n.split(".");
  return [parseInt(a, 10), parseInt(b, 10)];
}

export async function getPresidentBySlug(
  slug: string
): Promise<PresidentScorecard | null> {
  const president = await prisma.president.findUnique({
    where: { slug },
    include: {
      expertScores: {
        include: {
          subCriterion: { include: { category: true } },
          _count: { select: { evidence: true } },
          evidence: {
            orderBy: [{ tier: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });
  if (!president) return null;

  const categories = await prisma.category.findMany({
    orderBy: { number: "asc" },
    include: { subCriteria: true },
  });

  const scoreBySubId = new Map(
    president.expertScores.map((s) => [s.subCriterionId, s])
  );

  const nets = computeCategoryNets(president.expertScores);
  const weightedTotalDefault = computeWeightedTotal(
    nets,
    LENS_WEIGHTS.default as unknown as CategoryWeights
  );

  const blocks: CategoryBlock[] = categories.map((cat) => {
    const subRows: SubCriterionRow[] = cat.subCriteria
      .slice()
      .sort((a, b) => {
        const [ax, ay] = parseSubNumber(a.number);
        const [bx, by] = parseSubNumber(b.number);
        return ax - bx || ay - by;
      })
      .map((sub) => {
        const score = scoreBySubId.get(sub.id);
        if (!score) {
          return {
            id: sub.id,
            number: sub.number,
            name: sub.name,
            goodScore: null,
            harmScore: null,
            net: null,
            notes: null,
            lowConfidence: false,
            insufficientTimeElapsed: false,
            tentativeLongTail: false,
            scoreStatus: null,
            eraContext: null,
            evidenceCount: 0,
            evidence: [],
          };
        }
        const net =
          score.goodScore !== null && score.harmScore !== null
            ? score.goodScore - score.harmScore
            : null;
        return {
          id: sub.id,
          number: sub.number,
          name: sub.name,
          goodScore: score.goodScore,
          harmScore: score.harmScore,
          net,
          notes: score.notes,
          lowConfidence: score.lowConfidence,
          insufficientTimeElapsed: score.insufficientTimeElapsed,
          tentativeLongTail: score.tentativeLongTail,
          scoreStatus: score.scoreStatus,
          eraContext: score.eraContext,
          evidenceCount: score._count.evidence,
          evidence: score.evidence.map((e) => ({
            sourceUrl: e.sourceUrl,
            citation: e.citation,
            sourceType: e.sourceType,
            tier: e.tier,
            claim: e.claim,
            verbatimQuote: e.verbatimQuote,
            direction: e.direction,
            verificationStatus: e.verificationStatus,
          })),
        };
      });

    const scorableSubCount = subRows.filter(
      (s) =>
        s.goodScore !== null &&
        s.harmScore !== null &&
        !(s.goodScore === 0 && s.harmScore === 0)
    ).length;

    return {
      id: cat.id,
      number: cat.number,
      name: cat.name,
      description: cat.description,
      defaultWeight: Number(cat.defaultWeight),
      net: nets[cat.number] ?? null,
      scorableSubCount,
      subCriteria: subRows,
    };
  });

  return {
    id: president.id,
    slug: president.slug,
    displayName: president.displayName,
    party: president.party,
    termStart: president.termStart,
    termEnd: president.termEnd,
    termsServed: president.termsServed,
    calibrationAnchor: president.calibrationAnchor,
    anchorStatus: president.anchorStatus,
    inOffice: president.inOffice,
    catTenStatus: president.catTenStatus,
    partialTermNote: president.partialTermNote,
    weightedTotalDefault,
    catTenDropped: nets[10] === null,
    categories: blocks,
  };
}

export async function getPresidentSlugs(): Promise<string[]> {
  const presidents = await prisma.president.findMany({
    select: { slug: true },
  });
  return presidents.map((p) => p.slug);
}

// ============================================================
// Sub-criterion cross-president view (Sprint 2 US-011)
// ============================================================

export interface PresidentScoreOnSub {
  presidentId: string; // UUID for vote target composition
  slug: string;
  displayName: string;
  party: string;
  termStart: Date;
  termEnd: Date | null;
  inOffice: boolean;
  goodScore: number | null;
  harmScore: number | null;
  net: number | null;
  notes: string | null;
  lowConfidence: boolean;
  insufficientTimeElapsed: boolean;
  tentativeLongTail: boolean;
  scoreStatus: string | null;
  eraContext: string | null;
  evidenceCount: number;
  evidence: EvidenceItem[];
}

export interface SubCriterionPage {
  id: string; // UUID for vote-target composition
  number: string;
  name: string;
  category: { number: number; name: string };
  scores: PresidentScoreOnSub[];
}

export async function getSubCriterionByNumber(
  number: string
): Promise<SubCriterionPage | null> {
  const sub = await prisma.subCriterion.findUnique({
    where: { number },
    include: {
      category: true,
      expertScores: {
        include: {
          president: true,
          _count: { select: { evidence: true } },
          evidence: {
            orderBy: [{ tier: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });
  if (!sub) return null;

  const scores: PresidentScoreOnSub[] = sub.expertScores.map((s) => {
    const net =
      s.goodScore !== null && s.harmScore !== null
        ? s.goodScore - s.harmScore
        : null;
    return {
      presidentId: s.president.id,
      slug: s.president.slug,
      displayName: s.president.displayName,
      party: s.president.party,
      termStart: s.president.termStart,
      termEnd: s.president.termEnd,
      inOffice: s.president.inOffice,
      goodScore: s.goodScore,
      harmScore: s.harmScore,
      net,
      notes: s.notes,
      lowConfidence: s.lowConfidence,
      insufficientTimeElapsed: s.insufficientTimeElapsed,
      tentativeLongTail: s.tentativeLongTail,
      scoreStatus: s.scoreStatus,
      eraContext: s.eraContext,
      evidenceCount: s._count.evidence,
      evidence: s.evidence.map((e) => ({
        sourceUrl: e.sourceUrl,
        citation: e.citation,
        sourceType: e.sourceType,
        tier: e.tier,
        claim: e.claim,
        verbatimQuote: e.verbatimQuote,
        direction: e.direction,
        verificationStatus: e.verificationStatus,
      })),
    };
  });

  // Sort: real nets descending, then nulls (n/a) last in chronological order
  scores.sort((a, b) => {
    if (a.net === null && b.net === null)
      return a.termStart.getTime() - b.termStart.getTime();
    if (a.net === null) return 1;
    if (b.net === null) return -1;
    return b.net - a.net;
  });

  return {
    id: sub.id,
    number: sub.number,
    name: sub.name,
    category: { number: sub.category.number, name: sub.category.name },
    scores,
  };
}

export async function getSubCriterionNumbers(): Promise<string[]> {
  const subs = await prisma.subCriterion.findMany({ select: { number: true } });
  return subs.map((s) => s.number);
}
