"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<{ href: Route; label: string }> = [
  { href: "/me/votes", label: "My votes" },
  { href: "/me/contributions", label: "My contributions" },
  { href: "/me/weights", label: "My weights" },
  { href: "/me/bookmarks", label: "My bookmarks" },
  { href: "/me/account", label: "Account" },
];

export function MeNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 text-sm flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <Link href="/" className="text-stone-600 hover:text-rust-700">
        ← The Full Index
      </Link>
      <span aria-hidden className="text-stone-400">
        ·
      </span>
      <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {ITEMS.map((item, i) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex items-baseline gap-x-4">
              {active ? (
                <span className="text-charcoal-900 font-medium border-b border-rust-700/60 pb-0.5">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-stone-600 hover:text-rust-700"
                >
                  {item.label}
                </Link>
              )}
              {i < ITEMS.length - 1 && (
                <span aria-hidden className="text-stone-400">
                  ·
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
