// Shared branded layout for all transactional emails.
//
// Email clients ignore <style> blocks and external CSS inconsistently, so
// everything here is table-based with inline styles — the lowest common
// denominator that renders correctly in Gmail, Outlook, and Apple Mail.
// Each template supplies a title, body HTML, and a plain-text equivalent;
// this module wraps them in the site's brand chrome (palette from
// OG_COLORS in site-config) and returns both MIME parts.

import {
  SITE_NAME,
  SITE_SUBHEADLINE,
  SITE_TAGLINE,
  SITE_TITLE,
  EMAIL_BASE_URL,
  EMAIL_LOGO_URL,
  OG_COLORS,
} from "@/lib/site-config";

export interface EmailBody {
  /** Pre-rendered, inline-styled HTML for the message body (between header and footer). */
  html: string;
  /** Plain-text equivalent of the body. Joined with the standard footer. */
  text: string;
}

/** Escape a string for safe interpolation into HTML email markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A primary call-to-action button rendered as a bulletproof table so it shows
 * up consistently across clients (including Outlook's Word renderer).
 */
export function button(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
    <tr>
      <td align="center" bgcolor="${OG_COLORS.rust800}" style="border-radius:8px;">
        <a href="${safeUrl}" target="_blank"
           style="display:inline-block;padding:14px 32px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Wrap a rendered body in the branded HTML shell. Returns a full HTML document
 * suitable for the `html` part of an email.
 */
export function renderHtml(body: EmailBody["html"]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(SITE_TITLE)}</title>
</head>
<body style="margin:0;padding:0;background-color:${OG_COLORS.cream100};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${OG_COLORS.cream100};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${OG_COLORS.stone300};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 40px;background-color:${OG_COLORS.charcoal900};">
              <a href="${escapeHtml(EMAIL_BASE_URL)}" target="_blank" style="text-decoration:none;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">
                      <img src="${escapeHtml(EMAIL_LOGO_URL)}" width="40" height="40" alt="${escapeHtml(SITE_NAME)} logo" style="display:block;width:40px;height:40px;border-radius:8px;border:0;outline:none;text-decoration:none;background-color:${OG_COLORS.cream50};" />
                    </td>
                    <td style="vertical-align:middle;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
                      <span style="display:block;font-size:18px;font-weight:700;">${escapeHtml(SITE_NAME)}</span>
                      <span style="display:block;font-size:11px;font-weight:400;letter-spacing:1.5px;text-transform:uppercase;color:${OG_COLORS.stone300};margin-top:4px;">${escapeHtml(SITE_SUBHEADLINE)}</span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px 40px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${OG_COLORS.charcoal900};">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 36px 40px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${OG_COLORS.stone500};border-top:1px solid ${OG_COLORS.stone300};">
              ${escapeHtml(SITE_TAGLINE)}<br>
              <a href="${escapeHtml(EMAIL_BASE_URL)}" target="_blank" style="color:${OG_COLORS.rust700};text-decoration:none;">${escapeHtml(EMAIL_BASE_URL.replace(/^https?:\/\//, ""))}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Wrap a plain-text body with the standard footer for the `text` MIME part. */
export function renderText(body: EmailBody["text"]): string {
  return `${body}\n\n—\n${SITE_NAME}\n${SITE_TAGLINE}\n${EMAIL_BASE_URL}`;
}
