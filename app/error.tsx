"use client";

// Route-segment error boundary. Catches render-time failures (most likely a
// transient Neon connection blip during ISR revalidation — see lib/prisma.ts
// withDbRetry) and shows a recoverable state instead of a raw 500.
//
// Server-component errors are still auto-reported to Sentry via the
// `onRequestError` hook in instrumentation.ts, so this boundary does NOT
// silence error tracking — it only changes what the user sees.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the browser console for local debugging; production reporting
    // is handled server-side by Sentry's onRequestError hook.
    console.error(error);
  }, [error]);

  return (
    <section className="text-center max-w-xl mx-auto py-24">
      <span className="inline-flex items-center gap-2 border border-rust-700/70 text-rust-700 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
        <span aria-hidden>⚠</span> Temporary Hiccup
      </span>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mt-7 tracking-tight">
        We couldn&rsquo;t load this just now
      </h1>
      <div className="rust-rule" />
      <p className="mt-8 text-lg leading-relaxed text-charcoal-700">
        This is almost always a brief database connection blip rather than a
        lasting outage. Give it a moment and try again.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-rust-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-rust-800 transition-colors"
        >
          Try again
        </button>
      </div>
      {error.digest && (
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-charcoal-700/60">
          Reference: {error.digest}
        </p>
      )}
    </section>
  );
}
