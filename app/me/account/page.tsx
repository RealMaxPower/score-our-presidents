import type { Route } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DeleteAccount } from "./delete-account";

export const metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in" as Route);

  const memberSince =
    user.accountAgeDays <= 0
      ? "today"
      : `${user.accountAgeDays} day${user.accountAgeDays === 1 ? "" : "s"} ago`;

  return (
    <article>
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          {user.email}
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          Account
        </h1>
      </header>

      <dl className="mb-12 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-stone-500">Email</dt>
        <dd className="text-charcoal-900">{user.email}</dd>
        <dt className="text-stone-500">Display name</dt>
        <dd className="text-charcoal-900">{user.displayName ?? "—"}</dd>
        <dt className="text-stone-500">Member since</dt>
        <dd className="text-charcoal-900">{memberSince}</dd>
      </dl>

      <DeleteAccount email={user.email} />
    </article>
  );
}
