import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ScoreRow } from "./score-row";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);

  const [scores, total] = await Promise.all([
    prisma.userScore.findMany({
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, displayName: true } },
        president: { select: { displayName: true, slug: true } },
        subCriterion: { select: { number: true, name: true } },
        _count: { select: { evidence: true } },
      },
    }),
    prisma.userScore.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <p className="text-sm text-charcoal-700 max-w-2xl">
        Deletions are permanent and write{" "}
        <code className="text-xs font-mono">user_score.delete.admin</code>{" "}
        to the audit log with the original owner&apos;s ID.
      </p>
      <div className="border border-stone-300/60 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-[10px] uppercase tracking-[0.14em] text-charcoal-700">
            <tr>
              <th className="text-left px-3 py-2">Submitted</th>
              <th className="text-left px-3 py-2">By</th>
              <th className="text-left px-3 py-2">President</th>
              <th className="text-left px-3 py-2">Sub-criterion</th>
              <th className="text-left px-3 py-2 text-right">Good</th>
              <th className="text-left px-3 py-2 text-right">Harm</th>
              <th className="text-left px-3 py-2 text-right">Evid</th>
              <th className="text-left px-3 py-2 w-1">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300/40">
            {scores.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-stone-500 italic">
                  No user-submitted scores yet.
                </td>
              </tr>
            )}
            {scores.map((s) => (
              <ScoreRow
                key={s.id}
                score={{
                  id: s.id,
                  createdAt: s.createdAt.toISOString(),
                  userEmail: s.user.email,
                  userDisplayName: s.user.displayName,
                  presidentName: s.president.displayName,
                  presidentSlug: s.president.slug,
                  subNumber: s.subCriterion.number,
                  subName: s.subCriterion.name,
                  goodScore: s.goodScore,
                  harmScore: s.harmScore,
                  evidenceCount: s._count.evidence,
                  notes: s.notes,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
        <span className="text-stone-500">
          {total.toLocaleString()} scores · page {page + 1} / {totalPages}
        </span>
      </nav>
    </div>
  );
}
