"use client";

import type { Route } from "next";
import Link from "next/link";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { useState, useTransition } from "react";

interface Props {
  email: string;
  displayName: string | null;
}

export function UserMenu({ email, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initials = (displayName ?? email).slice(0, 2).toUpperCase();

  function signOut() {
    startTransition(async () => {
      // Clear both NextAuth session and the dev cookie fallback so signing
      // out works regardless of which path the user signed in through.
      await Promise.all([
        nextAuthSignOut({ redirect: false }).catch(() => undefined),
        fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => undefined),
      ]);
      setOpen(false);
      // Full page navigation rather than router.refresh(): a soft refresh can
      // race with NextAuth's Set-Cookie response and re-render the server
      // layout before the JWT cookie is actually cleared. A hard nav
      // guarantees the next request sees the cleared cookie state.
      window.location.assign("/");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-charcoal-900 text-cream-50 text-[11px] font-medium hover:bg-rust-700 transition-colors"
        title={displayName ?? email}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-cream-50 border border-stone-300/60 rounded-sm shadow-lg z-50 text-sm"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 py-2 border-b border-stone-200/60">
            <div className="font-medium text-charcoal-900 truncate">
              {displayName ?? email}
            </div>
            <div className="text-[11px] text-stone-500 truncate">{email}</div>
          </div>
          <Link
            href={"/me/votes" as Route}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-cream-100"
          >
            My votes
          </Link>
          <Link
            href={"/me/contributions" as Route}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-cream-100"
          >
            My contributions
          </Link>
          <Link
            href={"/me/weights" as Route}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-cream-100"
          >
            My weights
          </Link>
          <Link
            href={"/me/bookmarks" as Route}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-cream-100"
          >
            My bookmarks
          </Link>
          <Link
            href={"/me/account" as Route}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-cream-100 border-t border-stone-200/60"
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="w-full text-left px-3 py-2 hover:bg-cream-100 text-rust-700 disabled:opacity-50"
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
