"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface PendingPatch {
  body: Record<string, unknown>;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  reputationScore: number;
  emailVerified: boolean;
  accountAgeDays: number;
  isDeleted: boolean;
}

export function UserRow({
  user,
  isSelf,
}: {
  user: AdminUserRow;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [repInput, setRepInput] = useState(user.reputationScore.toFixed(2));
  const [pendingConfirm, setPendingConfirm] = useState<PendingPatch | null>(
    null
  );

  function patch(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Unlock cookie expired mid-session — surface a re-unlock prompt
        // rather than a raw status code so the admin knows what to do.
        if (res.status === 401 && data?.error === "ADMIN_LOCKED") {
          setError("ADMIN_LOCKED");
          return;
        }
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  function patchWithConfirm(confirm: PendingPatch) {
    setPendingConfirm(confirm);
  }

  return (
    <tr className={user.isDeleted ? "opacity-60" : ""}>
      <td className="px-3 py-2 font-mono text-xs">{user.email}</td>
      <td className="px-3 py-2">{user.displayName ?? "—"}</td>
      <td className="px-3 py-2 text-xs">
        {user.emailVerified ? (
          <span className="text-good-700">yes</span>
        ) : (
          <span className="text-stone-500">no</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums">
        {user.accountAgeDays}
      </td>
      <td className="px-3 py-2">
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const next = parseFloat(repInput);
            if (Number.isNaN(next)) {
              setError("Reputation must be a number");
              return;
            }
            patch({ reputationScore: next });
          }}
        >
          <input
            type="number"
            step="0.05"
            min="0"
            max="5"
            value={repInput}
            onChange={(e) => setRepInput(e.target.value)}
            className="w-16 bg-cream-100 border border-stone-300/60 rounded-sm px-1.5 py-1 text-xs font-mono tabular-nums"
            disabled={pending || user.isDeleted}
          />
          <button
            type="submit"
            disabled={
              pending ||
              user.isDeleted ||
              parseFloat(repInput) === user.reputationScore
            }
            className="text-[10px] uppercase tracking-[0.14em] text-stone-600 hover:text-rust-700 disabled:opacity-30"
          >
            Set
          </button>
        </form>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() =>
            patchWithConfirm({
              body: { isAdmin: !user.isAdmin },
              title: user.isAdmin
                ? `Revoke admin from ${user.email}?`
                : `Grant admin to ${user.email}?`,
              confirmLabel: user.isAdmin ? "Revoke" : "Grant",
              destructive: user.isAdmin,
            })
          }
          disabled={pending || isSelf || user.isDeleted}
          className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-sm border ${
            user.isAdmin
              ? "bg-rust-700/10 border-rust-700/30 text-rust-800"
              : "bg-stone-100 border-stone-300/60 text-stone-600"
          } hover:bg-cream-200 disabled:opacity-30`}
          title={isSelf ? "Cannot change your own admin role" : undefined}
        >
          {user.isAdmin ? "admin" : "user"}
        </button>
      </td>
      <td className="px-3 py-2 text-xs">
        {user.isDeleted ? (
          <span className="text-rust-700 uppercase tracking-[0.14em]">
            deleted
          </span>
        ) : (
          <span className="text-good-700 uppercase tracking-[0.14em]">
            active
          </span>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() =>
            patchWithConfirm({
              body: { softDeleted: !user.isDeleted },
              title: user.isDeleted
                ? `Restore ${user.email}?`
                : `Soft-delete ${user.email}?`,
              description: user.isDeleted
                ? "They will regain access immediately."
                : "They can be restored later.",
              confirmLabel: user.isDeleted ? "Restore" : "Soft-delete",
              destructive: !user.isDeleted,
            })
          }
          disabled={pending || (isSelf && !user.isDeleted)}
          className="text-[10px] uppercase tracking-[0.14em] text-rust-700 hover:text-rust-800 disabled:opacity-30"
          title={
            isSelf && !user.isDeleted
              ? "Cannot soft-delete your own account"
              : undefined
          }
        >
          {user.isDeleted ? "Restore" : "Soft-delete"}
        </button>
        {error === "ADMIN_LOCKED" ? (
          <div className="text-[10px] text-rust-700 mt-1 leading-relaxed">
            Unlock expired ·{" "}
            <Link
              href="/admin/unlock"
              className="underline underline-offset-2 hover:text-rust-800"
            >
              Re-unlock
            </Link>
          </div>
        ) : (
          error && (
            <div className="text-[10px] text-rust-700 mt-1">{error}</div>
          )
        )}
        <ConfirmDialog
          open={pendingConfirm !== null}
          title={pendingConfirm?.title ?? ""}
          description={pendingConfirm?.description}
          confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
          destructive={pendingConfirm?.destructive}
          pending={pending}
          onConfirm={() => {
            if (pendingConfirm) {
              const body = pendingConfirm.body;
              setPendingConfirm(null);
              patch(body);
            }
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      </td>
    </tr>
  );
}
