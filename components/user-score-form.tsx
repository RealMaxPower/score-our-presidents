"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SOURCE_TYPES, type SourceType } from "@/lib/user-scores";

interface ExistingScore {
  goodScore: number;
  harmScore: number;
  notes: string;
  evidence: {
    sourceUrl: string;
    claim: string;
    direction: "good" | "harm";
  }[];
}

interface Props {
  presidentId: string;
  subCriterionId: string;
  subCriterionLabel: string; // e.g. "1.1 Growth & employment"
  presidentDisplayName: string;
  existing: ExistingScore | null;
}

export function UserScoreForm({
  presidentId,
  subCriterionId,
  subCriterionLabel,
  presidentDisplayName,
  existing,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [good, setGood] = useState(existing?.goodScore ?? 5);
  const [harm, setHarm] = useState(existing?.harmScore ?? 5);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [sourceUrl, setSourceUrl] = useState(existing?.evidence[0]?.sourceUrl ?? "");
  const [claim, setClaim] = useState(existing?.evidence[0]?.claim ?? "");
  const [direction, setDirection] = useState<"good" | "harm">(
    existing?.evidence[0]?.direction ?? "good"
  );
  const [sourceType, setSourceType] = useState<SourceType>("journalism");

  const net = good - harm;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch("/api/user-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presidentId,
          subCriterionId,
          goodScore: good,
          harmScore: harm,
          notes,
          evidence: [
            { sourceUrl, claim, direction, sourceType, tier: 2 },
          ],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reasons = (data?.reasons ?? []).join(" ");
        setError(reasons || data?.error || `HTTP ${res.status}`);
        return;
      }
      setSuccess(
        existing ? "Score updated." : "Score submitted. Thanks for contributing."
      );
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-4 bg-cream-50 border border-stone-300/60 rounded-sm p-4"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
        {existing ? "Edit your score" : "Submit your score"} ·{" "}
        {presidentDisplayName} · {subCriterionLabel}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <SliderRow
          label="Good (positive impact, 0–10)"
          value={good}
          onChange={setGood}
          color="text-good-700"
          accent="accent-good-500"
        />
        <SliderRow
          label="Harm (negative impact, 0–10)"
          value={harm}
          onChange={setHarm}
          color="text-rust-700"
          accent="accent-harm-500"
        />
      </div>

      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
        Net = good − harm ={" "}
        <span
          className={`font-mono font-semibold ${
            net >= 0 ? "text-good-700" : "text-rust-700"
          }`}
        >
          {net >= 0 ? "+" : ""}
          {net}
        </span>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
          Your reasoning (1–2 sentences, 10–500 chars)
        </span>
        <textarea
          required
          minLength={10}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-rust-700"
          rows={3}
          placeholder="In your own words: why does this score reflect their record?"
        />
      </label>

      <div className="border-t border-stone-300/40 pt-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-2">
          Supporting source (required)
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Source URL
            </span>
            <input
              type="url"
              required
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-rust-700"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Source type
            </span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-rust-700"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block mt-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Claim (1–2 sentences from this source, 10–500 chars)
          </span>
          <textarea
            required
            minLength={10}
            maxLength={500}
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-rust-700"
            rows={2}
            placeholder="What does this source say that supports your score?"
          />
        </label>
        <div className="mt-3 flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
          <span>Direction this source supports:</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={direction === "good"}
              onChange={() => setDirection("good")}
              className="accent-good-500"
            />
            <span className="text-good-700">Good</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={direction === "harm"}
              onChange={() => setDirection("harm")}
              className="accent-harm-500"
            />
            <span className="text-rust-700">Harm</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center bg-rust-700 hover:bg-rust-800 text-cream-50 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
        >
          {pending ? "Submitting…" : existing ? "Save changes" : "Submit score"}
        </button>
        {error && (
          <span className="text-xs text-rust-700 leading-snug">{error}</span>
        )}
        {success && (
          <span className="text-xs text-good-700 leading-snug">{success}</span>
        )}
      </div>
    </form>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  color,
  accent,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  color: string;
  accent: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          {label}
        </span>
        <span className={`font-display font-bold text-xl tabular-nums ${color}`}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={`mt-1 w-full ${accent}`}
      />
    </label>
  );
}
