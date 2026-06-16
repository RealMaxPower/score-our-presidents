"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface AdminScoreRow {
  id: string;
  createdAt: string;
  userEmail: string;
  userDisplayName: string | null;
  presidentName: string;
  presidentSlug: string;
  subNumber: string;
  subName: string;
  goodScore: number | null;
  harmScore: number | null;
  evidenceCount: number;
  notes: string;
}

export function ScoreRow({ score }: { score: AdminScoreRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function del() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/user-scores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userScoreId: score.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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

  return (
    <tr className="hover:bg-cream-100/60">
      <td className="px-3 py-2 font-mono text-xs text-stone-600 whitespace-nowrap">
        {score.createdAt.replace("T", " ").slice(0, 16)}
      </td>
      <td className="px-3 py-2 text-xs">
        <div className="font-mono">{score.userEmail}</div>
        {score.userDisplayName && (
          <div className="text-stone-500">{score.userDisplayName}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/president/${score.presidentSlug}` as `/president/${string}`}
          className="text-rust-700 hover:text-rust-800 text-xs"
        >
          {score.presidentName}
        </Link>
      </td>
      <td className="px-3 py-2 text-xs">
        <Link
          href={`/sub-criterion/${score.subNumber}` as `/sub-criterion/${string}`}
          className="font-mono text-stone-600 hover:text-rust-700"
        >
          {score.subNumber}
        </Link>{" "}
        <span className="text-stone-700">{score.subName}</span>
        {score.notes && (
          <div className="text-stone-500 text-[11px] mt-1 max-w-md italic line-clamp-2">
            “{score.notes}”
          </div>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-right text-good-700">
        {score.goodScore ?? "—"}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-right text-rust-700">
        {score.harmScore ?? "—"}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-right text-stone-600">
        {score.evidenceCount}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="text-[10px] uppercase tracking-[0.14em] text-rust-700 hover:text-rust-800 disabled:opacity-30"
        >
          Delete
        </button>
        <ConfirmDialog
          open={confirming}
          title="Delete this score?"
          description={`From ${score.userEmail} on ${score.presidentName} · ${score.subNumber}. This is permanent.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={() => {
            setConfirming(false);
            del();
          }}
          onCancel={() => setConfirming(false)}
        />
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
      </td>
    </tr>
  );
}
