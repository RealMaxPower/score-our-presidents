import type { Route } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import {
  getPresidentCategoryNets,
  LENS_WEIGHTS,
} from "@/lib/rankings";
import { WeightsEditor } from "./weights-editor";

export const metadata = {
  title: "Personal weights",
};

export default async function MyWeightsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in" as Route);

  const [categories, savedWeights, presidentNets] = await Promise.all([
    prisma.category.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, defaultWeight: true },
    }),
    prisma.userWeight.findMany({
      where: { userId: user.id },
      select: { categoryId: true, weight: true },
    }),
    getPresidentCategoryNets(),
  ]);

  const savedByCat = new Map(
    savedWeights.map((w) => [w.categoryId, Number(w.weight)])
  );

  // Default = LENS_WEIGHTS.default; if user has saved weights, those override
  const defaultWeights = LENS_WEIGHTS.default as unknown as Record<number, number>;
  const initialWeights: Record<number, number> = {};
  for (const c of categories) {
    initialWeights[c.number] =
      savedByCat.get(c.id) ?? defaultWeights[c.number] ?? 0;
  }

  return (
    <article>
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          {user.email}
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          Personal weights
        </h1>
        <p className="text-sm text-charcoal-700 mt-3 leading-relaxed max-w-3xl">
          Set how much each of the 13 categories matters in your ranking.
          Sliders rebalance as you drag; the live ranking on the right updates
          as you change weights. Click <strong>Save</strong> to persist and
          unlock the <em>Yours</em> lens on the home page.
        </p>
        {savedWeights.length === 0 && (
          <p className="text-xs text-stone-500 italic mt-2">
            Loaded with the default lens. Adjust and save to make these yours.
          </p>
        )}
      </header>

      <WeightsEditor
        categories={categories.map((c) => ({
          id: c.id,
          number: c.number,
          name: c.name,
          defaultWeight: Number(c.defaultWeight),
        }))}
        initialWeights={initialWeights}
        hasSavedWeights={savedWeights.length > 0}
        presidents={presidentNets}
      />
    </article>
  );
}
