"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteContributionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function del() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/user-scores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userScoreId: id }),
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 underline underline-offset-2"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
      <button
        type="button"
        onClick={del}
        disabled={pending}
        className="text-rust-700 hover:text-rust-800 underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-stone-500 hover:text-charcoal-900"
      >
        Cancel
      </button>
      {error && <span className="text-rust-700">{error}</span>}
    </div>
  );
}
