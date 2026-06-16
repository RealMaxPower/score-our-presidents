// GET /api/presidents — list all 16 presidents with default-weighted ranking
// First API route; verifies the data flow end-to-end (Prisma → ranking math → JSON)

import { NextResponse } from "next/server";
import { getRankingsByLens, LENS_WEIGHTS, type LensSlug } from "@/lib/rankings";
import { z } from "zod";

export const revalidate = 3600; // 1 hour cache

const querySchema = z.object({
  lens: z
    .enum(Object.keys(LENS_WEIGHTS) as [LensSlug, ...LensSlug[]])
    .optional()
    .default("default"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    lens: url.searchParams.get("lens") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const rankings = await getRankingsByLens(parsed.data.lens);

  return NextResponse.json({
    lens: parsed.data.lens,
    count: rankings.length,
    generatedAt: new Date().toISOString(),
    rankings: rankings.map((p, i) => ({
      rank: i + 1,
      slug: p.slug,
      displayName: p.displayName,
      party: p.party,
      termStart: p.termStart,
      termEnd: p.termEnd,
      weightedTotal: Number(p.weightedTotal.toFixed(2)),
      catTenDropped: p.catTenDropped,
    })),
  });
}
