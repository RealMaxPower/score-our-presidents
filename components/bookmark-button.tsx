"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  presidentId: string;
  initialBookmarked: boolean;
  authed: boolean;
  /** Inline (no label, just star) or labeled (star + "Bookmark") */
  variant?: "icon" | "labeled";
}

export function BookmarkButton({
  presidentId,
  initialBookmarked,
  authed,
  variant = "icon",
}: Props) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!authed) return;
    const next = !bookmarked;
    const prev = bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const res = await fetch("/api/bookmarks", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presidentId }),
      });
      if (!res.ok) {
        setBookmarked(prev);
        return;
      }
      router.refresh();
    });
  }

  if (!authed) {
    return (
      <Link
        href={"/sign-in" as Route}
        aria-label="Sign in to bookmark"
        title="Sign in to bookmark"
        className="inline-flex items-center justify-center w-7 h-7 text-stone-300 hover:text-rust-700 transition-colors"
      >
        <StarIcon filled={false} />
      </Link>
    );
  }

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={bookmarked}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] uppercase tracking-[0.18em] transition disabled:opacity-50 ${
          bookmarked
            ? "border-rust-700 text-rust-700 bg-rust-700/10 font-semibold"
            : "border-stone-300/60 text-charcoal-700 hover:border-rust-700/60 hover:text-rust-700"
        }`}
      >
        <StarIcon filled={bookmarked} />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
      title={bookmarked ? "Remove bookmark" : "Bookmark this president"}
      className={`inline-flex items-center justify-center w-7 h-7 transition-colors disabled:opacity-50 ${
        bookmarked
          ? "text-rust-700 hover:text-rust-800"
          : "text-stone-300 hover:text-rust-700"
      }`}
    >
      <StarIcon filled={bookmarked} />
    </button>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
