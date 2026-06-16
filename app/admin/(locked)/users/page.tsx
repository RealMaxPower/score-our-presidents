import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { UserRow } from "./user-row";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.userProfile.findMany({
    orderBy: [{ deletedAt: { sort: "asc", nulls: "first" } }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
      reputationScore: true,
      emailVerified: true,
      accountCreatedAt: true,
      deletedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-charcoal-700 max-w-2xl">
        Admin actions write an entry to the audit log. You cannot revoke your
        own admin role or soft-delete your own account from this page.
      </p>
      <div className="border border-stone-300/60 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-[10px] uppercase tracking-[0.14em] text-charcoal-700">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Display name</th>
              <th className="text-left px-3 py-2">Verified</th>
              <th className="text-left px-3 py-2">Age (d)</th>
              <th className="text-left px-3 py-2">Reputation</th>
              <th className="text-left px-3 py-2">Admin</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2 w-1">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300/40">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  email: u.email,
                  displayName: u.displayName,
                  isAdmin: u.isAdmin,
                  reputationScore: Number(u.reputationScore),
                  emailVerified: u.emailVerified,
                  accountAgeDays: Math.floor(
                    (Date.now() - u.accountCreatedAt.getTime()) / 86400000
                  ),
                  isDeleted: u.deletedAt !== null,
                }}
                isSelf={u.id === admin.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
