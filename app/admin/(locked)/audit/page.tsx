import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const KNOWN_ACTIONS = [
  "sign_in.success",
  "sign_in.failure",
  "sign_out",
  "user_score.create",
  "user_score.update",
  "user_score.delete.owner",
  "user_score.delete.admin",
  "admin.access",
  "admin.user.is_admin.granted",
  "admin.user.is_admin.revoked",
  "admin.user.reputation.set",
  "admin.user.soft_deleted",
  "admin.user.restored",
  "admin.unlock.success",
  "admin.unlock.failure",
  "admin.lock",
] as const;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    actor?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);

  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.actor ? { actorId: sp.actor } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-charcoal-700">
            Action
          </span>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="block mt-1 bg-cream-100 border border-stone-300/60 rounded-sm px-2 py-1.5 text-xs font-mono"
          >
            <option value="">— all —</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.14em] text-charcoal-700">
            Actor ID
          </span>
          <input
            type="text"
            name="actor"
            defaultValue={sp.actor ?? ""}
            placeholder="UUID prefix or full"
            className="block mt-1 bg-cream-100 border border-stone-300/60 rounded-sm px-2 py-1.5 text-xs font-mono w-72"
          />
        </label>
        <button
          type="submit"
          className="bg-rust-700 hover:bg-rust-800 text-cream-50 text-[11px] uppercase tracking-[0.18em] font-semibold px-3 py-2 rounded-sm"
        >
          Filter
        </button>
        {(sp.action || sp.actor) && (
          <Link
            href="/admin/audit"
            className="text-[11px] uppercase tracking-[0.18em] text-stone-600 hover:text-rust-700"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-stone-500">
          {total.toLocaleString()} events · page {page + 1} / {totalPages}
        </span>
      </form>

      <div className="border border-stone-300/60 rounded-sm overflow-x-auto">
        <table className="w-full text-xs font-mono tabular-nums">
          <thead className="bg-cream-100 text-[10px] uppercase tracking-[0.14em] text-charcoal-700">
            <tr>
              <th className="text-left px-3 py-2">When</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Target</th>
              <th className="text-left px-3 py-2">IP</th>
              <th className="text-left px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300/40">
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-stone-500 italic">
                  No events match.
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-cream-100/60">
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                  {e.occurredAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-3 py-2 text-charcoal-900 font-semibold whitespace-nowrap">
                  {e.action}
                </td>
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                  {e.actorId ? e.actorId.slice(0, 8) : "—"}
                </td>
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                  {e.targetType
                    ? `${e.targetType}:${e.targetId?.slice(0, 8) ?? "?"}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                  {e.ipAddress ?? "—"}
                </td>
                <td className="px-3 py-2 text-stone-500 max-w-md truncate">
                  {e.metadata ? JSON.stringify(e.metadata) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between text-sm">
        <PageLink
          page={page - 1}
          disabled={page === 0}
          searchParams={sp}
          label="← Newer"
        />
        <PageLink
          page={page + 1}
          disabled={page + 1 >= totalPages}
          searchParams={sp}
          label="Older →"
        />
      </nav>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  searchParams,
  label,
}: {
  page: number;
  disabled: boolean;
  searchParams: { action?: string; actor?: string };
  label: string;
}) {
  if (disabled)
    return <span className="text-stone-400 text-[11px] uppercase tracking-[0.18em]">{label}</span>;
  const q = new URLSearchParams();
  if (searchParams.action) q.set("action", searchParams.action);
  if (searchParams.actor) q.set("actor", searchParams.actor);
  if (page > 0) q.set("page", String(page));
  return (
    <Link
      href={`/admin/audit${q.toString() ? `?${q}` : ""}` as Route}
      className="text-rust-700 hover:text-rust-800 text-[11px] uppercase tracking-[0.18em]"
    >
      {label}
    </Link>
  );
}
