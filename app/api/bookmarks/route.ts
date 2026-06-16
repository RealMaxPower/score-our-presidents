// POST   /api/bookmarks   body: { presidentId }  — add bookmark (idempotent)
// DELETE /api/bookmarks   body: { presidentId }  — remove bookmark (idempotent)
//
// Auth required. No eligibility gate; bookmarks are a personal artifact.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { requireJsonContentType } from "@/lib/http";

const bodySchema = z.object({
  presidentId: z.string().uuid(),
});

async function readBody(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }) };
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.format() },
        { status: 400 }
      ),
    };
  }
  return { data: parsed.data };
}

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const r = await readBody(request);
  if ("error" in r) return r.error;

  const president = await prisma.president.findUnique({
    where: { id: r.data.presidentId },
    select: { id: true },
  });
  if (!president) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.bookmark.upsert({
    where: {
      userId_presidentId: { userId: user.id, presidentId: r.data.presidentId },
    },
    update: {},
    create: { userId: user.id, presidentId: r.data.presidentId },
  });
  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const r = await readBody(request);
  if ("error" in r) return r.error;

  await prisma.bookmark.deleteMany({
    where: { userId: user.id, presidentId: r.data.presidentId },
  });
  return NextResponse.json({ bookmarked: false });
}
