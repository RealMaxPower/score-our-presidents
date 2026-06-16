"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RevokeButton({
  targetType,
  targetId,
}: {
  targetType: "president" | "category" | "sub_criterion";
  targetId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revoked, setRevoked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      setRevoked(true);
      router.refresh();
    });
  }

  if (revoked) {
    return (
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
        Revoked
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {error && (
        <span className="text-[11px] text-rust-700">{error}</span>
      )}
    </div>
  );
}
