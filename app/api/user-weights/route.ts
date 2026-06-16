// POST /api/user-weights   body: { weights: { "1": number, "2": number, ..., "13": number } }
//   - Accepts a partial or full vector keyed by category number
//   - Server normalizes the values to sum to 100
//   - Replaces all 13 UserWeight rows for this user in a single transaction
// DELETE /api/user-weights — clear saved weights (user reverts to default lens)
//
// Auth required. No eligibility gate beyond authed-and-not-soft-deleted.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { requireJsonContentType } from "@/lib/http";

const weightsSchema = z.object({
  // Keys are category numbers "1".."13"; values are non-negative numbers.
  weights: z
    .record(z.string().regex(/^([1-9]|1[0-3])$/), z.number().min(0).max(100))
    .refine((w) => Object.values(w).some((v) => v > 0), {
      message: "At least one category weight must be > 0",
    }),
});

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = weightsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const raw = parsed.data.weights;

  // Resolve category UUIDs and normalize values to sum=100
  const categories = await prisma.category.findMany({
    select: { id: true, number: true },
  });
  const byNumber = new Map(categories.map((c) => [c.number, c.id]));

  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Sum of weights must be > 0" },
      { status: 400 }
    );
  }
  const factor = 100 / sum;
  const rows = Object.entries(raw)
    .map(([numStr, value]) => {
      const num = parseInt(numStr, 10);
      const categoryId = byNumber.get(num);
      if (!categoryId) return null;
      return {
        userId: user.id,
        categoryId,
        weight: Number((value * factor).toFixed(2)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await prisma.$transaction([
    prisma.userWeight.deleteMany({ where: { userId: user.id } }),
    prisma.userWeight.createMany({ data: rows }),
  ]);

  return NextResponse.json({ saved: rows.length });
}

export async function DELETE(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  await prisma.userWeight.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
