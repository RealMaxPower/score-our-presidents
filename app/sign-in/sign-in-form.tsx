"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

interface Props {
  // Provider visibility — gated server-side so we don't render buttons whose
  // provider isn't configured.
  hasGoogle: boolean;
  hasEmail: boolean;
  hasDev: boolean;
  /** Where to land after a successful sign-in. */
  callbackUrl: string;
}

// Google brand guidelines for the OAuth button:
// https://developers.google.com/identity/branding-guidelines
// We use the "neutral" / light style: white background, 1px gray border,
// inline color "G" SVG, dark gray text. Text is "Sign in with Google".
function GoogleGLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

const RESEND_COOLDOWN_S = 30;

export function SignInForm({ hasGoogle, hasEmail, hasDev, callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [pending, startTransition] = useTransition();
  // A separate flag for Google: once clicked, the browser is leaving for
  // accounts.google.com — we want the button to stay disabled even after
  // the transition has nominally completed, so a stuck network won't let
  // the user double-click.
  const [googleLeaving, setGoogleLeaving] = useState(false);

  // Countdown for the magic-link resend button.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (resendIn <= 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setResendIn((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [resendIn]);

  async function submitDev(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await signIn("dev-email", { email, redirect: false });
      if (result?.error) {
        // Generic copy — never leak which provider this is, what tooling
        // creates accounts, or that the failure was a missing UserProfile.
        // Server logs carry the actual cause for operators.
        setError("That email isn't recognized. Try again or use another method.");
        return;
      }
      // Hard navigation, not router.refresh(): NextAuth's JWT cookie can
      // race a soft refresh and leave the layout showing the pre-sign-in
      // state. Going through the browser guarantees the next request sees
      // the cleared cookie state.
      window.location.assign(callbackUrl);
    });
  }

  async function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (resendIn > 0) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await signIn("resend", { email, redirect: false });
      if (result?.error) {
        setError(
          "Couldn't send the magic link. Double-check the email and try again."
        );
        return;
      }
      setMagicSent(true);
      setInfo(`Sign-in link sent to ${email}. Check your inbox (and spam).`);
      setResendIn(RESEND_COOLDOWN_S);
    });
  }

  function signInWithGoogle() {
    if (googleLeaving) return;
    setError(null);
    setInfo(null);
    setGoogleLeaving(true);
    // No startTransition — we want this state to stick until the browser
    // navigates away. signIn() with redirectTo triggers a top-level nav.
    void signIn("google", { redirectTo: callbackUrl });
  }

  return (
    <div className="space-y-6">
      {hasGoogle && (
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLeaving || pending}
          className="w-full inline-flex items-center justify-center gap-3 bg-white text-[#3c4043] text-sm font-medium px-4 py-2.5 rounded-sm border border-stone-300 shadow-sm hover:bg-stone-50 hover:shadow transition disabled:opacity-60 disabled:cursor-wait"
        >
          <GoogleGLogo />
          {googleLeaving ? "Redirecting to Google…" : "Sign in with Google"}
        </button>
      )}

      {hasGoogle && (hasEmail || hasDev) && (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-stone-500">
          <span className="flex-1 h-px bg-stone-300/60" />
          or
          <span className="flex-1 h-px bg-stone-300/60" />
        </div>
      )}

      {hasEmail && (
        <form onSubmit={submitMagicLink} className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
              Email me a sign-in link
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-rust-700 disabled:opacity-60"
              placeholder="you@example.com"
            />
          </label>
          <div className="flex items-baseline gap-3">
            <button
              type="submit"
              disabled={pending || resendIn > 0 || email.length === 0}
              className="inline-flex items-center bg-rust-700 hover:bg-rust-800 text-cream-50 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
            >
              {pending
                ? "Sending…"
                : magicSent
                  ? resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : "Resend link"
                  : "Send link"}
            </button>
            {magicSent && resendIn === 0 && (
              <span className="text-[11px] text-stone-500">
                Didn&apos;t get it? Check spam or resend.
              </span>
            )}
          </div>
        </form>
      )}

      {hasDev && (
        <form onSubmit={submitDev} className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
              Dev sign-in (seeded users only)
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="mt-1 w-full bg-cream-100 border border-stone-300/60 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-rust-700 disabled:opacity-60"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={pending || email.length === 0}
            className="inline-flex items-center border-2 border-rust-700 text-rust-700 hover:bg-rust-700/10 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in (dev)"}
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="text-xs text-rust-700 leading-relaxed"
        >
          {error}
        </p>
      )}
      {info && (
        <p className="text-xs text-good-700 leading-relaxed">{info}</p>
      )}
    </div>
  );
}
