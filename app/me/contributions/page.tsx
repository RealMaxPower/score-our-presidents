import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { DeleteContributionButton } from "./delete-button";

export const metadata = {
  title: "My contributions",
};

export default async function MyContributionsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in" as Route);

  const scores = await prisma.userScore.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      president: { select: { slug: true, displayName: true } },
      subCriterion: {
        select: { number: true, name: true, category: { select: { name: true, number: true } } },
      },
      evidence: {
        select: {
          sourceUrl: true,
          claim: true,
          direction: true,
          sourceType: true,
        },
      },
    },
  });

  return (
    <article>
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          {user.email}
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          My contributions
        </h1>
        <p className="text-sm text-stone-500 mt-3">
          {scores.length === 0
            ? "You haven't submitted any scores yet. Find a sub-criterion you want to weigh in on and click \"Add your score.\""
            : `${scores.length} contribution${scores.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      {scores.length > 0 && (
        <ul className="divide-y divide-stone-300/60 border-y border-stone-300/60">
          {scores.map((s) => {
            const net =
              s.goodScore !== null && s.harmScore !== null
                ? s.goodScore - s.harmScore
                : null;
            return (
              <li
                key={s.id}
                className="py-6 grid sm:grid-cols-[1fr_auto] gap-4"
              >
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-1">
                    {s.subCriterion.category.name} · {s.subCriterion.number}
                  </div>
                  <div className="font-display font-bold text-lg sm:text-xl tracking-tight">
                    <Link
                      href={`/president/${s.president.slug}` as Route}
                      className="hover:text-rust-700"
                    >
                      {s.president.displayName}
                    </Link>{" "}
                    <span className="text-charcoal-700">
                      · {s.subCriterion.name}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal-700 mt-2 leading-relaxed">
                    {s.notes}
                  </p>
                  {s.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {s.evidence.map((e, i) => (
                        <li
                          key={i}
                          className="text-xs leading-snug text-charcoal-700"
                        >
                          <span
                            className={`font-mono uppercase tracking-[0.14em] ${
                              e.direction === "good"
                                ? "text-good-700"
                                : "text-rust-700"
                            }`}
                          >
                            {e.direction}
                          </span>{" "}
                          · {e.claim}
                          {e.sourceUrl && (
                            <>
                              {" "}
                              <a
                                href={e.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rust-700 hover:text-rust-800 underline underline-offset-2 break-all"
                              >
                                source ↗
                              </a>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <div className="font-mono tabular-nums text-sm">
                    <span className="text-good-700">+{s.goodScore}</span>
                    <span className="text-stone-400 mx-1.5">/</span>
                    <span className="text-rust-700">−{s.harmScore}</span>
                  </div>
                  <div
                    className={`font-display font-bold text-2xl tabular-nums ${
                      net !== null && net >= 0
                        ? "text-good-700"
                        : "text-rust-700"
                    }`}
                  >
                    {net !== null && net >= 0 ? "+" : ""}
                    {net}
                  </div>
                  <DeleteContributionButton id={s.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
