"use client";

import { useState, useTransition } from "react";

export function UnlockForm() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const retryS = Math.ceil((data?.retryAfterMs ?? 0) / 1000);
          setError(`Too many attempts. Try again in ${retryS}s.`);
        } else if (res.status === 401) {
          setError("Token did not match.");
        } else {
          setError(data?.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      // Hard nav so the locked layout re-runs server-side and picks up
      // the new cookie state, identical to the sign-in / sign-out fix.
      window.location.assign("/admin");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
          Admin token
        </span>
        <input
          type="password"
          required
          autoComplete="off"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-rust-700"
          placeholder="paste token"
        />
      </label>
      <button
        type="submit"
        disabled={pending || token.length === 0}
        className="inline-flex items-center bg-rust-700 hover:bg-rust-800 text-cream-50 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
      >
        {pending ? "Unlocking…" : "Unlock"}
      </button>
      {error && (
        <p className="text-xs text-rust-700 leading-relaxed">{error}</p>
      )}
    </form>
  );
}
