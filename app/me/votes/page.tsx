import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { RevokeButton } from "./revoke-button";

export const metadata = {
  title: "My votes",
};

interface ResolvedVote {
  id: string;
  targetType: "president" | "category" | "sub_criterion";
  targetId: string;
  direction: "agree" | "disagree";
  createdAt: Date;
  // Human-readable label parts
  presidentDisplayName: string | null;
  presidentSlug: string | null;
  categoryName: string | null;
  subCriterionLabel: string | null; // e.g. "1.1 Growth & employment"
  subCriterionNumber: string | null;
}

export default async function MyVotesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in" as Route);

  const votes = await prisma.userVote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Collect referenced IDs
  const presidentIds = new Set<string>();
  const categoryIds = new Set<string>();
  const subCriterionIds = new Set<string>();

  for (const v of votes) {
    if (v.targetType === "president") {
      presidentIds.add(v.targetId);
    } else if (v.targetType === "category") {
      const [pId, cId] = v.targetId.split(":");
      if (pId) presidentIds.add(pId);
      if (cId) categoryIds.add(cId);
    } else if (v.targetType === "sub_criterion") {
      const [pId, sId] = v.targetId.split(":");
      if (pId) presidentIds.add(pId);
      if (sId) subCriterionIds.add(sId);
    }
  }

  const [presidents, categories, subs] = await Promise.all([
    presidentIds.size
      ? prisma.president.findMany({
          where: { id: { in: Array.from(presidentIds) } },
          select: { id: true, displayName: true, slug: true },
        })
      : Promise.resolve([]),
    categoryIds.size
      ? prisma.category.findMany({
          where: { id: { in: Array.from(categoryIds) } },
          select: { id: true, name: true, number: true },
        })
      : Promise.resolve([]),
    subCriterionIds.size
      ? prisma.subCriterion.findMany({
          where: { id: { in: Array.from(subCriterionIds) } },
          select: { id: true, name: true, number: true },
        })
      : Promise.resolve([]),
  ]);

  const presidentBy = new Map(presidents.map((p) => [p.id, p]));
  const categoryBy = new Map(categories.map((c) => [c.id, c]));
  const subBy = new Map(subs.map((s) => [s.id, s]));

  const resolved: ResolvedVote[] = votes.map((v) => {
    const base: ResolvedVote = {
      id: v.id,
      targetType: v.targetType as ResolvedVote["targetType"],
      targetId: v.targetId,
      direction: v.direction as ResolvedVote["direction"],
      createdAt: v.createdAt,
      presidentDisplayName: null,
      presidentSlug: null,
      categoryName: null,
      subCriterionLabel: null,
      subCriterionNumber: null,
    };
    if (v.targetType === "president") {
      const p = presidentBy.get(v.targetId);
      if (p) {
        base.presidentDisplayName = p.displayName;
        base.presidentSlug = p.slug;
      }
    } else if (v.targetType === "category") {
      const [pId, cId] = v.targetId.split(":");
      const p = pId ? presidentBy.get(pId) : undefined;
      const c = cId ? categoryBy.get(cId) : undefined;
      if (p) {
        base.presidentDisplayName = p.displayName;
        base.presidentSlug = p.slug;
      }
      if (c) base.categoryName = `C${c.number} · ${c.name}`;
    } else if (v.targetType === "sub_criterion") {
      const [pId, sId] = v.targetId.split(":");
      const p = pId ? presidentBy.get(pId) : undefined;
      const s = sId ? subBy.get(sId) : undefined;
      if (p) {
        base.presidentDisplayName = p.displayName;
        base.presidentSlug = p.slug;
      }
      if (s) {
        base.subCriterionLabel = `${s.number} ${s.name}`;
        base.subCriterionNumber = s.number;
      }
    }
    return base;
  });

  return (
    <article>
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          {user.email}
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          My votes
        </h1>
        <p className="text-sm text-stone-500 mt-3">
          {resolved.length === 0
            ? "You haven't reacted to any scores yet."
            : `${resolved.length} vote${resolved.length === 1 ? "" : "s"} cast.`}
        </p>
      </header>

      {resolved.length > 0 && (
        <ul className="divide-y divide-stone-300/60 border-y border-stone-300/60">
          {resolved.map((v) => (
            <li key={v.id} className="py-5 grid sm:grid-cols-[1fr_auto] gap-4 items-baseline">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap text-[11px] uppercase tracking-[0.18em]">
                  <span
                    className={`font-semibold ${
                      v.direction === "agree" ? "text-good-700" : "text-rust-700"
                    }`}
                  >
                    {v.direction === "agree" ? "▲ Agree" : "▼ Disagree"}
                  </span>
                  <span className="text-stone-500">·</span>
                  <span className="text-stone-500">{v.targetType.replace("_", " ")}</span>
                  <span className="text-stone-400">·</span>
                  <time className="text-stone-400">
                    {v.createdAt.toISOString().slice(0, 10)}
                  </time>
                </div>
                <div className="mt-1 text-sm">
                  {v.presidentSlug && v.presidentDisplayName && (
                    <Link
                      href={`/president/${v.presidentSlug}` as Route}
                      className="font-display font-bold text-lg sm:text-xl hover:text-rust-700"
                    >
                      {v.presidentDisplayName}
                    </Link>
                  )}
                  {v.categoryName && (
                    <span className="ml-2 text-charcoal-700">
                      · {v.categoryName}
                    </span>
                  )}
                  {v.subCriterionLabel && v.subCriterionNumber && (
                    <span className="ml-2 text-charcoal-700">
                      ·{" "}
                      <Link
                        href={`/sub-criterion/${v.subCriterionNumber}` as Route}
                        className="hover:text-rust-700"
                      >
                        {v.subCriterionLabel}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <RevokeButton
                  targetType={v.targetType}
                  targetId={v.targetId}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
