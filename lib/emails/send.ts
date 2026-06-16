// Minimal Resend REST client for transactional email sent outside of Auth.js.
//
// Auth.js's Resend provider calls the same API internally for the magic-link
// flow; this helper covers app-triggered email (e.g. account-deletion
// confirmations). No SDK dependency — a single fetch against the documented
// REST endpoint keeps the surface tiny and avoids version drift.

import type { RenderedEmail } from "@/lib/emails/templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Send a rendered email via Resend. Best-effort by design: if Resend is not
 * configured (no AUTH_RESEND_KEY / EMAIL_FROM, as in local dev), this logs and
 * returns `false` rather than throwing, so callers never block a user-facing
 * action on email delivery. Returns `true` when Resend accepts the message.
 */
export async function sendEmail(
  to: string,
  email: RenderedEmail
): Promise<boolean> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      `[email] Resend not configured; skipping "${email.subject}" to ${to}`
    );
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[email] Resend rejected "${email.subject}" to ${to}: ${res.status} ${detail}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${email.subject}" to ${to}:`, err);
    return false;
  }
}
