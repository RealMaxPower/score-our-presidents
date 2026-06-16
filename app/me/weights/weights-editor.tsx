"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PresidentNets } from "@/lib/rankings";
// IMPORTANT: import the math from lib/rankings-math, not lib/rankings.
// lib/rankings imports lib/prisma (which imports lib/env), and bundling
// any of that into a client component crashes at runtime in the browser
// because server-only env vars (DATABASE_URL) are missing.
import { computeWeightedTotal } from "@/lib/rankings-math";
import type { CategoryWeights } from "@/lib/lens-presets";

interface CategoryRow {
  id: string;
  number: number;
  name: string;
  defaultWeight: number;
}

interface Props {
  categories: CategoryRow[];
  initialWeights: Record<number, number>;
  hasSavedWeights: boolean;
  presidents: PresidentNets[];
}

function normalize(raw: Record<number, number>): Record<number, number> {
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return raw;
  const factor = 100 / sum;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[parseInt(k, 10)] = v * factor;
  }
  return out;
}

function formatTerm(start: string, end: string | null) {
  const s = new Date(start).getFullYear();
  const e = end ? new Date(end).getFullYear() : "—";
  return `${s} – ${e}`;
}

export function WeightsEditor({
  categories,
  initialWeights,
  hasSavedWeights,
  presidents,
}: Props) {
  const router = useRouter();
  const [raw, setRaw] = useState<Record<number, number>>(initialWeights);
  const [baseline, setBaseline] = useState<Record<number, number>>(initialWeights);
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(hasSavedWeights);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const sumRaw = useMemo(
    () => Object.values(raw).reduce((a, b) => a + b, 0),
    [raw]
  );
  const normalized = useMemo(() => normalize(raw), [raw]);

  const isDirty = useMemo(() => {
    const keys = new Set([
      ...Object.keys(raw).map(Number),
      ...Object.keys(baseline).map(Number),
    ]);
    for (const k of keys) {
      if ((raw[k] ?? 0) !== (baseline[k] ?? 0)) return true;
    }
    return false;
  }, [raw, baseline]);

  // Warn on hard navigation (tab close, refresh, address bar, external links).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Warn on client-side <Link>/<a> clicks within the app — beforeunload does
  // not fire for App Router soft navigation, so intercept same-origin clicks.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // Block the navigation and surface the in-app modal. If the user
      // confirms, the modal's handler will router.push() to this href.
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  const rankings = useMemo(() => {
    const weights = normalized as unknown as CategoryWeights;
    return [...presidents]
      .map((p) => ({
        ...p,
        weightedTotal: computeWeightedTotal(p.categoryNets, weights),
      }))
      .sort((a, b) => b.weightedTotal - a.weightedTotal);
  }, [normalized, presidents]);

  function setCategory(num: number, value: number) {
    setRaw((prev) => ({ ...prev, [num]: value }));
  }

  function resetToDefault() {
    const fresh: Record<number, number> = {};
    for (const c of categories) fresh[c.number] = c.defaultWeight;
    setRaw(fresh);
  }

  function save() {
    setError(null);
    setSavedFlash(null);
    startTransition(async () => {
      const body = {
        weights: Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, Number(v)])
        ),
      };
      const res = await fetch("/api/user-weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? data?.error ?? `HTTP ${res.status}`);
        return;
      }
      setHasSaved(true);
      setBaseline({ ...raw });
      setSavedFlash("Saved · Yours lens unlocked on the home page.");
      router.refresh();
    });
  }

  function clearSaved() {
    setError(null);
    setSavedFlash(null);
    startTransition(async () => {
      const res = await fetch("/api/user-weights", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      setHasSaved(false);
      setBaseline({ ...raw });
      setSavedFlash("Cleared · home page returns to default lens.");
      router.refresh();
    });
  }

  return (
    <>
    <div className="grid lg:grid-cols-[1fr_1fr] gap-10">
      {/* Sliders */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
            Your weights
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Normalized to 100% on save
          </span>
        </div>
        <ul className="space-y-3">
          {categories.map((c) => {
            const rawValue = raw[c.number] ?? 0;
            const normValue = normalized[c.number] ?? 0;
            const isDefault = rawValue === c.defaultWeight;
            return (
              <li
                key={c.id}
                className="border-b border-stone-300/60 pb-3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    <span className="font-mono text-xs text-stone-400 mr-2">
                      C{c.number}
                    </span>
                    {c.name}
                  </span>
                  <span className="font-mono tabular-nums text-sm">
                    <span
                      className={
                        isDefault ? "text-stone-500" : "text-rust-700 font-semibold"
                      }
                    >
                      {normValue.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={0.5}
                  value={rawValue}
                  onChange={(e) =>
                    setCategory(c.number, parseFloat(e.target.value))
                  }
                  className="mt-1 w-full accent-rust-700"
                />
                <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] text-stone-400 mt-0.5">
                  <span>0</span>
                  <span>raw: {rawValue.toFixed(1)} · default {c.defaultWeight}</span>
                  <span>25</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mt-4">
          Sum (raw): {sumRaw.toFixed(1)} ·{" "}
          {sumRaw <= 0 ? (
            <span className="text-rust-700">add weight to at least 1 category</span>
          ) : (
            <span>normalizes to 100%</span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || sumRaw <= 0}
            className="inline-flex items-center bg-rust-700 hover:bg-rust-800 text-cream-50 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {pending ? "Saving…" : hasSaved ? "Update weights" : "Save weights"}
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            disabled={pending}
            className="text-[11px] uppercase tracking-[0.18em] text-stone-600 hover:text-rust-700 underline underline-offset-2"
          >
            Reset to default lens
          </button>
          {hasSaved && (
            <button
              type="button"
              onClick={clearSaved}
              disabled={pending}
              className="text-[11px] uppercase tracking-[0.18em] text-stone-600 hover:text-rust-700 underline underline-offset-2"
            >
              Clear saved weights
            </button>
          )}
          {savedFlash && (
            <span className="text-xs text-good-700 leading-snug">
              {savedFlash}
            </span>
          )}
          {error && (
            <span className="text-xs text-rust-700 leading-snug">{error}</span>
          )}
        </div>
      </section>

      {/* Live ranking preview */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
            Live ranking
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Updates as you drag
          </span>
        </div>
        <ol className="divide-y divide-stone-300/60 border-y border-stone-300/60">
          {rankings.map((p, i) => {
            const positive = p.weightedTotal >= 0;
            return (
              <li
                key={p.presidentId}
                className="flex items-baseline gap-3 py-3"
              >
                <span className="font-display italic text-stone-400 text-base tabular-nums w-7 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base tracking-tight truncate">
                    {p.displayName}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-stone-500">
                    {formatTerm(p.termStart, p.termEnd)}
                    {p.catTenDropped && " · Cat 10 dropped"}
                  </div>
                </div>
                <span
                  className={`font-display font-bold tabular-nums text-lg shrink-0 ${
                    positive ? "text-good-700" : "text-rust-700"
                  }`}
                >
                  {positive ? "+" : ""}
                  {p.weightedTotal.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
    <ConfirmDialog
      open={pendingHref !== null}
      title="Leave without saving?"
      description="Your weight changes have not been saved. If you leave this page now, they will be discarded."
      confirmLabel="Leave"
      cancelLabel="Stay"
      destructive
      onConfirm={() => {
        const href = pendingHref;
        setPendingHref(null);
        if (href) router.push(href as Route);
      }}
      onCancel={() => setPendingHref(null)}
    />
    </>
  );
}
