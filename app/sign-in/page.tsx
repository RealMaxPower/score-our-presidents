import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in",
};

// NextAuth redirects auth failures back here with ?error=<code>. Map the
// most common codes to neutral, user-facing copy. Never name env vars,
// internal tooling, or "seeded users" — those are admin concerns and
// belong in server logs, not in the page a visitor sees.
const ERROR_COPY: Record<string, string> = {
  OAuthSignin: "Couldn't reach the sign-in provider. Try again in a moment.",
  OAuthCallback: "Sign-in failed. Try again.",
  OAuthCreateAccount: "Couldn't complete sign-in. Try again.",
  OAuthAccountNotLinked:
    "That email is already linked to a different sign-in method. Use the original method or contact support.",
  EmailCreateAccount: "Couldn't send the sign-in email. Try again.",
  EmailSignin: "We couldn't send a sign-in link to that address. Double-check the spelling.",
  Verification:
    "That sign-in link is expired or already used. Request a fresh one below.",
  Callback: "Sign-in failed. Try again.",
  CredentialsSignin: "That email or password isn't recognized.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong. Try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const hasGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const hasEmail = Boolean(
    process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM
  );
  // Dev sign-in is ONLY available in non-production builds with the disable
  // flag unset. Belt-and-suspenders: NODE_ENV alone is enough on Vercel; the
  // explicit flag lets dev/staging operators turn it off without rebuilding.
  const hasDev =
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_DISABLE_DEV_CREDENTIALS !== "1";
  const anyProvider = hasGoogle || hasEmail || hasDev;

  const sp = await searchParams;
  const errorMessage = sp.error
    ? ERROR_COPY[sp.error] ?? ERROR_COPY.Default
    : null;

  // Log the actual config gap server-side so operators see it; never expose
  // env-var names to visitors.
  if (!anyProvider) {
    console.warn(
      "[sign-in] No auth providers configured. Set GOOGLE_CLIENT_ID/SECRET or AUTH_RESEND_KEY+EMAIL_FROM."
    );
  }

  return (
    <div className="max-w-md mx-auto py-4">
      <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-4">
        Sign in
      </h1>

      {!anyProvider ? (
        <div className="rounded-sm border border-stone-300/60 bg-cream-100 p-4 text-sm text-charcoal-700 leading-relaxed">
          Sign-in is temporarily unavailable. Please try again later or{" "}
          <Link
            href="/methodology"
            className="underline underline-offset-2 hover:text-rust-700"
          >
            keep browsing
          </Link>{" "}
          while we&rsquo;re back.
        </div>
      ) : (
        <>
          <p className="text-sm text-charcoal-700 leading-relaxed mb-6">
            {hasGoogle && hasEmail
              ? "Sign in with Google for a one-click flow, or use a sign-in link by email."
              : hasGoogle
                ? "Sign in with your Google account."
                : hasEmail
                  ? "Enter your email and we'll send you a sign-in link."
                  : "Sign in to continue."}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-sm border border-rust-700/30 bg-rust-700/5 p-3 text-xs text-rust-700 leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <SignInForm
            hasGoogle={hasGoogle}
            hasEmail={hasEmail}
            hasDev={hasDev}
            callbackUrl={sp.callbackUrl ?? "/"}
          />

          <p className="mt-8 text-[11px] text-stone-500 leading-relaxed">
            By signing in you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-rust-700"
            >
              terms of service
            </Link>{" "}
            and acknowledge our{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-rust-700"
            >
              privacy policy
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
