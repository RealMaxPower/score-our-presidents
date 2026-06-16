"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * Danger-zone control for irreversible self-service account deletion.
 *
 * Two safeguards before the request fires: the user must type their exact
 * email to enable the button, then confirm a destructive dialog. On success
 * we sign out of both auth paths (mirroring components/user-menu.tsx) and hard
 * navigate home — the account no longer exists.
 */
export function DeleteAccount({ email }: { email: string }) {
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const armed = typed.trim().toLowerCase() === email.toLowerCase();

  function destroy() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setError(`Couldn't delete your account (HTTP ${res.status}). Try again.`);
        setOpen(false);
        return;
      }
      // Clear both NextAuth session and the dev cookie fallback, then hard
      // navigate so the next request sees signed-out state.
      await Promise.all([
        nextAuthSignOut({ redirect: false }).catch(() => undefined),
        fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => undefined),
      ]);
      window.location.assign("/");
    });
  }

  return (
    <div className="rounded-sm border-2 border-rust-700/40 bg-rust-700/[0.03] p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg sm:text-xl tracking-tight text-rust-800">
        Delete account
      </h2>
      <p className="text-sm text-charcoal-700 leading-relaxed mt-2">
        This permanently deletes your account and removes your email, saved
        weights, scores, votes, and bookmarks. It cannot be undone. Aggregate
        community statistics computed before deletion remain in non-identifying
        form, as described in our{" "}
        <a
          href="/privacy"
          className="text-rust-700 hover:text-rust-800 underline underline-offset-2"
        >
          privacy policy
        </a>
        .
      </p>

      <label className="block mt-5 text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
        Type <span className="font-semibold text-charcoal-900">{email}</span> to
        confirm
      </label>
      <input
        type="email"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={pending}
        className="mt-2 w-full max-w-sm rounded-sm border border-stone-300/80 bg-cream-50 px-3 py-2 text-sm text-charcoal-900 focus:border-rust-700 focus:outline-none disabled:opacity-50"
        placeholder={email}
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!armed || pending}
          className="text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm border-2 bg-rust-700 border-rust-700 text-cream-50 hover:bg-rust-800 hover:border-rust-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete my account
        </button>
        {error && <span className="text-sm text-rust-700">{error}</span>}
      </div>

      <ConfirmDialog
        open={open}
        destructive
        title="Delete your account?"
        description={
          "This permanently deletes your account and all of your contributions. " +
          "This action cannot be undone."
        }
        confirmLabel="Delete account"
        pending={pending}
        onConfirm={destroy}
        onCancel={() => !pending && setOpen(false)}
      />
    </div>
  );
}
