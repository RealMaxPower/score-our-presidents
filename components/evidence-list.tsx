import type { EvidenceItem } from "@/lib/queries";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  academic: "Academic",
  journalism: "Journalism",
  primary_document: "Primary document",
  statistic: "Statistic",
  historical_record: "Historical record",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// 30% of seeded evidence carries `source_url: "canonical"` (a stub from the
// YAML scoring set) instead of a real URL. Render those as plain text so we
// don't emit relative <a href="canonical"> links that route to
// /president/<slug>/canonical.
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) return null;

  return (
    <details className="mt-2 ml-12 group/evidence">
      <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-rust-700 hover:text-rust-800 list-none inline-flex items-center gap-1.5">
        <span className="group-open/evidence:hidden">
          View {items.length} source{items.length === 1 ? "" : "s"} →
        </span>
        <span className="hidden group-open/evidence:inline">
          Hide sources ↑
        </span>
      </summary>
      <ul className="mt-3 space-y-3 border-l-2 border-rust-700/20 pl-4">
        {items.map((e, i) => (
          <EvidenceCard key={i} e={e} />
        ))}
      </ul>
    </details>
  );
}

function EvidenceCard({ e }: { e: EvidenceItem }) {
  const directionColor =
    e.direction === "good" ? "text-good-700" : "text-rust-700";
  const directionLabel = e.direction === "good" ? "good" : "harm";
  const sourceTypeLabel = SOURCE_TYPE_LABELS[e.sourceType] ?? e.sourceType;

  return (
    <li className="text-xs leading-relaxed">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] mb-1.5">
        <span className={`font-medium ${directionColor}`}>
          {directionLabel}
        </span>
        <span className="text-stone-400">·</span>
        <span className="text-stone-500">Tier {e.tier}</span>
        <span className="text-stone-400">·</span>
        <span className="text-stone-500">{sourceTypeLabel}</span>
        {e.verificationStatus === "verified" && (
          <>
            <span className="text-stone-400">·</span>
            <span className="text-good-700">URL verified</span>
          </>
        )}
        {e.verificationStatus === "pending" && (
          <>
            <span className="text-stone-400">·</span>
            <span className="text-stone-400">Unverified</span>
          </>
        )}
        {e.verificationStatus === "failed" && (
          <>
            <span className="text-stone-400">·</span>
            <span className="text-rust-700">Verification failed</span>
          </>
        )}
      </div>
      <p className="text-charcoal-700 mb-1.5">{e.claim}</p>
      {e.verbatimQuote && (
        <blockquote className="border-l-2 border-stone-300/60 pl-3 italic text-stone-600 mb-1.5">
          “{e.verbatimQuote}”
        </blockquote>
      )}
      {e.sourceUrl && isHttpUrl(e.sourceUrl) ? (
        <a
          href={e.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-rust-700 hover:text-rust-800 underline underline-offset-2 break-all"
        >
          {hostname(e.sourceUrl)} ↗
        </a>
      ) : e.citation ? (
        <span className="text-stone-500 italic">{e.citation}</span>
      ) : null}
    </li>
  );
}
