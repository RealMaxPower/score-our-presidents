import type { Route } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import {
  getCommunityWeights,
  DISPLAY_MIN_USERS,
  QUALIFYING_AGE_DAYS,
} from "@/lib/community-weights";

export const metadata = {
  title: "Community weights",
};

export default async function CommunityWeightsPage() {
  const [user, agg] = await Promise.all([currentUser(), getCommunityWeights()]);

  return (
    <article>
      <nav className="mb-8 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
        <span className="text-stone-400">·</span>
        <Link
          href="/methodology"
          className="text-stone-600 hover:text-rust-700"
        >
          Methodology
        </Link>
      </nav>

      <header className="mb-10 max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          Community aggregate
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          Community weights
        </h1>
        <p className="text-sm text-charcoal-700 mt-3 leading-relaxed">
          The 13-category weight vector aggregated across all signed-in users
          who have verified their email and held an account for at least{" "}
          {QUALIFYING_AGE_DAYS} day{QUALIFYING_AGE_DAYS === 1 ? "" : "s"}.
          Each row shows the <strong>median</strong> weight assigned by
          qualifying users, the interquartile range (Q1–Q3), and the
          default-lens weight for comparison.
        </p>
      </header>

      {!agg.shouldDisplay ? (
        <section className="bg-cream-100 border border-stone-300/60 rounded-sm p-6 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-2">
            Unlocks at N ≥ {DISPLAY_MIN_USERS}
          </div>
          <p className="text-sm text-charcoal-700 leading-relaxed">
            Currently <strong>{agg.qualifyingUserCount}</strong> qualifying
            user{agg.qualifyingUserCount === 1 ? "" : "s"}. The community
            aggregate is hidden until at least {DISPLAY_MIN_USERS} verified
            users with accounts older than {QUALIFYING_AGE_DAYS} day
            {QUALIFYING_AGE_DAYS === 1 ? "" : "s"} have saved their weights —
            a single early voter shouldn&rsquo;t define &ldquo;what the
            community thinks.&rdquo;
          </p>
          {user ? (
            <Link
              href={"/me/weights" as Route}
              className="inline-flex items-center gap-2 mt-4 text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 underline underline-offset-2"
            >
              Set your weights to contribute →
            </Link>
          ) : (
            <Link
              href={"/sign-in" as Route}
              className="inline-flex items-center gap-2 mt-4 text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 underline underline-offset-2"
            >
              Sign in to contribute →
            </Link>
          )}
        </section>
      ) : (
        <section>
          <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-4">
            Based on N = {agg.qualifyingUserCount} qualifying users
          </div>
          <table className="w-full text-sm border-y border-stone-300/60">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                <th className="text-left py-3 font-medium">Category</th>
                <th className="text-right py-3 font-medium">Default</th>
                <th className="text-right py-3 font-medium">Median</th>
                <th className="text-right py-3 font-medium">Q1 – Q3</th>
                <th className="text-right py-3 font-medium">IQR</th>
                <th className="text-right py-3 font-medium">N</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-300/40">
              {agg.perCategory.map((c) => {
                const diff = c.median - c.defaultWeight;
                const diffStyle =
                  Math.abs(diff) < 0.5
                    ? "text-stone-500"
                    : diff > 0
                    ? "text-rust-700"
                    : "text-good-700";
                return (
                  <tr key={c.categoryId}>
                    <td className="py-3">
                      <span className="font-mono text-xs text-stone-400 mr-2">
                        C{c.categoryNumber}
                      </span>
                      {c.categoryName}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-stone-500">
                      {c.defaultWeight.toFixed(1)}%
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">
                      {c.median.toFixed(1)}%
                      <span className={`ml-2 text-xs ${diffStyle}`}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-stone-600">
                      {c.q1.toFixed(1)} – {c.q3.toFixed(1)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-stone-500">
                      {c.iqr.toFixed(1)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-stone-500">
                      {c.contributorCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-stone-500 italic mt-4 max-w-3xl leading-relaxed">
            Median weight in the third column shows what qualifying users have
            actually saved. Numbers in rust mean the community weights this
            category higher than the default lens; numbers in blue, lower.
          </p>
        </section>
      )}
    </article>
  );
}
