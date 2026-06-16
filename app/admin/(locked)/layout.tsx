import { headers } from "next/headers";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import { LockButton } from "./lock-button";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/scores", label: "Scores" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  // Audit every navigation into the admin tree. Coarse — page-level only,
  // not per-render. Captures who's been browsing the admin surface.
  const h = await headers();
  await logAuditEvent({
    action: "admin.access",
    actorId: admin.id,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
    metadata: { path: h.get("x-invoke-path") ?? null },
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-stone-300/60 pb-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-2">
          Admin
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
            Site operations
          </h1>
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Signed in as{" "}
            <span className="text-charcoal-900 font-medium">{admin.email}</span>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[12px] uppercase tracking-[0.16em]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-charcoal-700 hover:text-rust-700"
            >
              {n.label}
            </Link>
          ))}
          <span className="ml-auto">
            <LockButton />
          </span>
        </nav>
      </header>
      {children}
    </div>
  );
}
