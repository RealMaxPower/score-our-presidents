import type { Metadata, Route } from "next";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { currentUser } from "@/lib/auth";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site-config";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const ROOT_DESCRIPTION =
  SITE_TAGLINE +
  " Switch lenses to see how rankings shift under different value frameworks.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: ROOT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: ROOT_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/api/og/default",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: ROOT_DESCRIPTION,
    images: ["/api/og/default"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  return (
    <html lang="en" className={display.variable} suppressHydrationWarning>
      <head>
        {/* No-flash theme init: runs before paint so the .dark class is on
            <html> before any CSS-variable-backed colors render. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-cream-50 text-charcoal-900 antialiased min-h-screen">
        <header className="sticky top-0 z-30 bg-cream-50/90 backdrop-blur supports-[backdrop-filter]:bg-cream-50/70 border-b border-stone-200/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" aria-label={`${SITE_NAME} — home`}>
              <Logo variant="lockup" />
            </Link>
            <nav className="flex items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-charcoal-700 shrink-0">
              <Link href="/" className="hover:text-rust-700">
                <span className="hidden sm:inline">The </span>Index
              </Link>
              <Link href="/methodology" className="hover:text-rust-700">
                Methodology
              </Link>
              <ThemeToggle />
              {user ? (
                <UserMenu email={user.email} displayName={user.displayName} />
              ) : (
                <Link
                  href={"/sign-in" as Route}
                  className="bg-charcoal-900 text-cream-50 px-3 py-1.5 rounded-sm hover:bg-rust-700 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">{children}</main>

        <footer className="mt-24 border-t border-stone-300/70 bg-cream-100">
          <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 sm:grid-cols-3 text-sm">
            <div>
              <Logo variant="footer" />
              <p className="mt-2 text-charcoal-700 leading-relaxed text-[13px]">
                An independent project dedicated to rigorous, non-partisan
                historical analysis. Five calibration anchors (FDR, Truman,
                Eisenhower, Nixon, Reagan) establish the scoring baseline
                against which every other president is measured.
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-3">
                Directory
              </div>
              <ul className="space-y-1.5 text-charcoal-900">
                <li>
                  <Link href="/" className="hover:text-rust-700">
                    The Full Index
                  </Link>
                </li>
                <li>
                  <Link href="/methodology" className="hover:text-rust-700">
                    Methodology
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-3">
                Participate
              </div>
              <ul className="space-y-1.5 text-charcoal-900">
                <li>
                  <Link href="/community/weights" className="hover:text-rust-700">
                    Community weights
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:contact@scoreourpresidents.org"
                    className="hover:text-rust-700"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-300/70">
            <div className="mx-auto max-w-6xl px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-charcoal-700 flex flex-wrap items-center justify-between gap-2">
              <span>© 2026 {SITE_NAME}</span>
              <span className="flex items-center gap-3">
                <Link href="/privacy" className="hover:text-rust-700">
                  Privacy
                </Link>
                <span aria-hidden>·</span>
                <Link href="/terms" className="hover:text-rust-700">
                  Terms
                </Link>
              </span>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
