// Validation for the browser error-report relay (app/api/sentry-tunnel).
// Pure functions so they can be unit-tested without a server.

// Browser error envelopes are a few KB; anything this large is not one.
export const SENTRY_TUNNEL_MAX_BYTES = 256 * 1024;

export interface SentryDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

export function parseDsn(dsn: string): SentryDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (
      u.protocol !== "https:" ||
      !u.username ||
      !/^\d+$/.test(projectId) ||
      !/(^|\.)sentry\.io$/.test(u.hostname)
    ) {
      return null;
    }
    return { host: u.hostname, projectId, publicKey: u.username };
  } catch {
    return null;
  }
}

// Returns the Sentry ingest URL to forward an envelope to, or null if the
// envelope isn't addressed to our own project. Only our DSN is accepted, so
// the relay can't be used to send data to anyone else's Sentry project.
export function tunnelTarget(
  envelope: string,
  allowedDsn: string | undefined
): string | null {
  const allowed = allowedDsn ? parseDsn(allowedDsn) : null;
  if (!allowed) return null;
  const newline = envelope.indexOf("\n");
  const headerLine = newline === -1 ? envelope : envelope.slice(0, newline);
  let header: unknown;
  try {
    header = JSON.parse(headerLine);
  } catch {
    return null;
  }
  const dsn =
    header && typeof header === "object" && "dsn" in header
      ? (header as { dsn: unknown }).dsn
      : null;
  const target = typeof dsn === "string" ? parseDsn(dsn) : null;
  if (
    !target ||
    target.host !== allowed.host ||
    target.projectId !== allowed.projectId ||
    target.publicKey !== allowed.publicKey
  ) {
    return null;
  }
  return `https://${allowed.host}/api/${allowed.projectId}/envelope/`;
}
