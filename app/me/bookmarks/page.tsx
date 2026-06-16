import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { BookmarkButton } from "@/components/bookmark-button";

export const metadata = {
  title: "My bookmarks",
};

function formatTerm(start: Date, end: Date | null) {
  const s = new Date(start).getFullYear();
  const e = end ? new Date(end).getFullYear() : "—";
  return `${s} – ${e}`;
}

export default async function MyBookmarksPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in" as Route);

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      president: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          party: true,
          termStart: true,
          termEnd: true,
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
          My bookmarks
        </h1>
        <p className="text-sm text-stone-500 mt-3">
          {bookmarks.length === 0
            ? "No bookmarks yet. Tap the star icon on any president card to save them here."
            : `${bookmarks.length} president${bookmarks.length === 1 ? "" : "s"} bookmarked.`}
        </p>
      </header>

      {bookmarks.length > 0 && (
        <ul className="divide-y divide-stone-300/60 border-y border-stone-300/60">
          {bookmarks.map((b) => (
            <li
              key={b.id}
              className="py-5 flex items-baseline gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/president/${b.president.slug}` as Route}
                  className="font-display font-bold text-lg sm:text-xl tracking-tight hover:text-rust-700"
                >
                  {b.president.displayName}
                </Link>
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mt-1">
                  {b.president.party === "D"
                    ? "Democrat"
                    : b.president.party === "R"
                    ? "Republican"
                    : b.president.party}
                  {" · "}
                  {formatTerm(b.president.termStart, b.president.termEnd)}
                  {" · saved "}
                  {b.createdAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <BookmarkButton
                presidentId={b.president.id}
                initialBookmarked
                authed
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
