import { redirect } from "next/navigation";
import { requireAdminAuthn, isAdminUnlocked } from "@/lib/admin";
import { UnlockForm } from "./unlock-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Unlock admin",
  robots: { index: false, follow: false },
};

export default async function AdminUnlockPage() {
  // Must be a signed-in admin to even see this page. Non-admins get 404
  // (route existence not leaked).
  const admin = await requireAdminAuthn();

  // If they're already unlocked, send them straight to the dashboard so
  // refreshing this URL doesn't re-prompt.
  if (await isAdminUnlocked()) {
    redirect("/admin");
  }

  return (
    <div className="max-w-md mx-auto py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
        Admin · second factor
      </div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-4">
        Unlock admin
      </h1>
      <p className="text-sm text-charcoal-700 leading-relaxed mb-6">
        Signed in as{" "}
        <span className="font-mono">{admin.email}</span>. Enter the admin
        token to access the admin tools in this browser. The unlock is
        scoped to <code className="font-mono text-xs">/admin/*</code>{" "}
        and expires after 8 hours of inactivity.
      </p>

      <UnlockForm />

      <p className="text-xs text-stone-500 italic mt-6 leading-relaxed">
        Failed attempts are rate-limited per IP and written to the audit
        log. Lose the token? Reset <code className="font-mono">ADMIN_TOKEN</code>{" "}
        in your production env and redeploy.
      </p>
    </div>
  );
}
