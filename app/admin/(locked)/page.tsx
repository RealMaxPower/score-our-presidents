import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [userCount, scoreCount, voteCount, recentEvents, last24h] =
    await Promise.all([
      prisma.userProfile.count({ where: { deletedAt: null } }),
      prisma.userScore.count(),
      prisma.userVote.count(),
      prisma.auditLog.findMany({
        orderBy: { occurredAt: "desc" },
        take: 10,
      }),
      prisma.auditLog.count({
        where: { occurredAt: { gte: new Date(Date.now() - 86400000) } },
      }),
    ]);

  return (
    <div className="space-y-10">
      <section className="grid sm:grid-cols-4 gap-4">
        <Stat label="Users" value={userCount} href="/admin/users" />
        <Stat label="User scores" value={scoreCount} href="/admin/scores" />
        <Stat label="Votes" value={voteCount} />
        <Stat label="Audit events / 24h" value={last24h} href="/admin/audit" />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xl tracking-tight">
            Recent activity
          </h2>
          <Link
            href="/admin/audit"
            className="text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800"
          >
            Full log →
          </Link>
        </div>
        <ul className="divide-y divide-stone-300/40 border border-stone-300/60 rounded-sm">
          {recentEvents.length === 0 && (
            <li className="px-4 py-3 text-sm text-stone-500 italic">
              No audit events yet.
            </li>
          )}
          {recentEvents.map((e) => (
            <li
              key={e.id}
              className="px-4 py-2 text-xs font-mono tabular-nums flex flex-wrap items-baseline gap-x-4"
            >
              <span className="text-stone-500 w-44">
                {e.occurredAt.toISOString().replace("T", " ").slice(0, 19)}
              </span>
              <span className="text-charcoal-900 font-semibold">
                {e.action}
              </span>
              {e.actorId && (
                <span className="text-stone-600">
                  actor {e.actorId.slice(0, 8)}
                </span>
              )}
              {e.ipAddress && (
                <span className="text-stone-500">{e.ipAddress}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: Route;
}) {
  const body = (
    <div className="border border-stone-300/60 rounded-sm p-4 bg-cream-100 hover:bg-cream-200/60 transition-colors">
      <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
        {label}
      </div>
      <div className="font-display font-bold text-3xl tabular-nums mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
