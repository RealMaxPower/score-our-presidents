"use client";

import { useState, useTransition } from "react";

type Direction = "agree" | "disagree";
type TargetType = "sub_criterion" | "category" | "president";

interface VoteState {
  agree: number;
  disagree: number;
  userVote: Direction | null;
}

interface Props {
  targetType: TargetType;
  targetId: string;
  initial: VoteState;
  size?: "sm" | "md";
  authed: boolean;
  label?: string; // e.g. "Agree with this score?"
}

export function VoteWidget({
  targetType,
  targetId,
  initial,
  size = "sm",
  authed,
  // Default anchors what the ▲/▼ arrows mean — without it the auth-state
  // widget reads as a generic upvote count and gets conflated with the
  // adjacent community-score cluster.
  label = "Agree with score?",
}: Props) {
  const [state, setState] = useState<VoteState>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dims =
    size === "md"
      ? "text-xs px-2.5 py-1.5 gap-1.5"
      : "text-[11px] px-2 py-1 gap-1";

  function applyOptimistic(direction: Direction): VoteState {
    const next = { ...state };
    if (next.userVote === direction) {
      // toggling off (revoke)
      next[direction] = Math.max(0, next[direction] - 1);
      next.userVote = null;
    } else {
      if (next.userVote === "agree") next.agree = Math.max(0, next.agree - 1);
      if (next.userVote === "disagree") next.disagree = Math.max(0, next.disagree - 1);
      next[direction] += 1;
      next.userVote = direction;
    }
    return next;
  }

  function vote(direction: Direction, e?: React.MouseEvent) {
    // Stop the click bubbling into a parent <summary> / <details> toggle when
    // the widget is rendered inside an expandable category card.
    e?.stopPropagation();
    e?.preventDefault();
    if (!authed) return;
    setError(null);
    const revert = state;
    const optimistic = applyOptimistic(direction);
    setState(optimistic);

    const method = revert.userVote === direction ? "DELETE" : "POST";
    const body =
      method === "POST"
        ? { targetType, targetId, direction }
        : { targetType, targetId };

    startTransition(async () => {
      try {
        const res = await fetch("/api/votes", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { counts: VoteState };
        setState(data.counts);
      } catch (e) {
        setState(revert);
        setError(e instanceof Error ? e.message : "Vote failed");
      }
    });
  }

  if (!authed) {
    return (
      <div
        className={`inline-flex items-center text-[10px] uppercase tracking-[0.14em] text-stone-400 ${dims}`}
      >
        <span>
          {state.agree} agree · {state.disagree} disagree
        </span>
        <a
          href="/sign-in"
          className="ml-2 text-rust-700 hover:text-rust-800 underline underline-offset-2"
        >
          Sign in to react
        </a>
      </div>
    );
  }

  const agreeActive = state.userVote === "agree";
  const disagreeActive = state.userVote === "disagree";

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {label && (
        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => vote("agree", e)}
          disabled={pending}
          aria-pressed={agreeActive}
          aria-label="Agree"
          className={`inline-flex items-center font-mono tabular-nums rounded-sm border transition ${dims} ${
            agreeActive
              ? "bg-good-500/20 border-good-500/60 text-good-700 font-semibold"
              : "border-stone-300/60 text-stone-600 hover:border-good-500/60 hover:text-good-700"
          } disabled:opacity-50`}
        >
          <span aria-hidden>▲</span>
          <span>{state.agree}</span>
        </button>
        <button
          type="button"
          onClick={(e) => vote("disagree", e)}
          disabled={pending}
          aria-pressed={disagreeActive}
          aria-label="Disagree"
          className={`inline-flex items-center font-mono tabular-nums rounded-sm border transition ${dims} ${
            disagreeActive
              ? "bg-rust-700/15 border-rust-700/60 text-rust-700 font-semibold"
              : "border-stone-300/60 text-stone-600 hover:border-rust-700/60 hover:text-rust-700"
          } disabled:opacity-50`}
        >
          <span aria-hidden>▼</span>
          <span>{state.disagree}</span>
        </button>
      </div>
      {error && (
        <span className="text-[10px] uppercase tracking-[0.14em] text-rust-700">
          {error}
        </span>
      )}
    </div>
  );
}
