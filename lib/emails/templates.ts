// Transactional email templates. Each returns a ready-to-send {subject, html,
// text} triple, with the body wrapped in the shared brand layout. Keep the set
// here small and deliberate: only emails triggered by a concrete user action
// (sign-in, account deletion) belong here — marketing/digest email would
// require opt-in + unsubscribe infrastructure that does not exist yet.

import { SITE_NAME, OG_COLORS } from "@/lib/site-config";
import {
  button,
  escapeHtml,
  renderHtml,
  renderText,
} from "@/lib/emails/layout";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Magic-link sign-in email. Replaces Auth.js's bare default template (which
 * shows the raw host as a heading and ships no plain-text part).
 */
export function magicLinkEmail(params: { url: string }): RenderedEmail {
  const { url } = params;
  const safeUrl = escapeHtml(url);

  const html = renderHtml(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:${OG_COLORS.charcoal900};">
      Sign in to ${escapeHtml(SITE_NAME)}
    </h1>
    <p style="margin:0 0 8px 0;">
      Click the button below to sign in. This link is single-use and expires
      shortly, so use it soon.
    </p>
    ${button("Sign in", url)}
    <p style="margin:0 0 8px 0;font-size:14px;color:${OG_COLORS.stone500};">
      Or paste this URL into your browser:<br>
      <a href="${safeUrl}" target="_blank" style="color:${OG_COLORS.rust700};word-break:break-all;">${safeUrl}</a>
    </p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${OG_COLORS.stone500};">
      If you did not request this email, you can safely ignore it — no one can
      sign in without this link.
    </p>
  `);

  const text = renderText(
    `Sign in to ${SITE_NAME}\n\n` +
      `Use this single-use link to sign in (it expires shortly):\n${url}\n\n` +
      `If you did not request this email, you can safely ignore it.`
  );

  return { subject: `Sign in to ${SITE_NAME}`, html, text };
}

/**
 * Account-deletion confirmation. Sent when an account is soft-deleted so the
 * owner has a record of the action — a security signal (a hijacked session
 * cannot silently erase an account unnoticed) and a privacy best practice.
 */
export function accountDeletedEmail(params: {
  displayName?: string | null;
}): RenderedEmail {
  const greeting = params.displayName
    ? `Hi ${escapeHtml(params.displayName)},`
    : "Hi,";

  const html = renderHtml(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:${OG_COLORS.charcoal900};">
      Your account has been deleted
    </h1>
    <p style="margin:0 0 12px 0;">${greeting}</p>
    <p style="margin:0 0 12px 0;">
      Your ${escapeHtml(SITE_NAME)} account has been deleted. Your email, saved
      weights, scores, votes, and bookmarks have been removed. Some
      contributions may persist in non-identifying, aggregated form as described
      in our privacy policy.
    </p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${OG_COLORS.stone500};">
      If you did not request this and believe your account was deleted in error,
      reply to this email and we'll look into it.
    </p>
  `);

  const text = renderText(
    `Your account has been deleted\n\n` +
      `${params.displayName ? `Hi ${params.displayName},` : "Hi,"}\n\n` +
      `Your ${SITE_NAME} account has been deleted. Your email, saved weights, ` +
      `scores, votes, and bookmarks have been removed. Some contributions may ` +
      `persist in non-identifying, aggregated form as described in our privacy policy.\n\n` +
      `If you did not request this and believe your account was deleted in error, ` +
      `reply to this email and we'll look into it.`
  );

  return {
    subject: `Your account on ${SITE_NAME} has been deleted`,
    html,
    text,
  };
}
