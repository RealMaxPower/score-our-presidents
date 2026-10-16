import { describe, expect, it } from "vitest";
import { parseDsn, tunnelTarget } from "../sentry-tunnel";

// Placeholder DSN (all-zero key, o12345 = the repo's placeholder org id):
// shaped like a real one, belongs to no project.
const OURS = "https://00000000000000000000000000000000@o12345.ingest.us.sentry.io/1234";
const header = (dsn: unknown) => JSON.stringify({ dsn, sent_at: "2026-01-01T00:00:00Z" });
const envelope = (dsn: unknown) => `${header(dsn)}\n{"type":"event"}\n{"message":"x"}`;

describe("parseDsn", () => {
  it("parses a Sentry DSN", () => {
    expect(parseDsn(OURS)).toEqual({
      host: "o12345.ingest.us.sentry.io",
      projectId: "1234",
      publicKey: "00000000000000000000000000000000",
    });
  });

  it.each([
    ["http://00000000000000000000000000000000@o12345.ingest.us.sentry.io/1234", "not https"],
    ["https://00000000000000000000000000000000@evil.example.com/1234", "not sentry.io"],
    ["https://00000000000000000000000000000000@sentry.io.evil.example/1234", "lookalike host"],
    ["https://o0.ingest.us.sentry.io/1234", "no public key"],
    ["https://00000000000000000000000000000000@o12345.ingest.us.sentry.io/abc", "non-numeric project"],
    ["not a url", "garbage"],
  ])("rejects %s (%s)", (dsn) => {
    expect(parseDsn(dsn)).toBeNull();
  });
});

describe("tunnelTarget", () => {
  it("forwards envelopes addressed to our DSN to its ingest endpoint", () => {
    expect(tunnelTarget(envelope(OURS), OURS)).toBe(
      "https://o12345.ingest.us.sentry.io/api/1234/envelope/"
    );
  });

  it("accepts a header-only envelope", () => {
    expect(tunnelTarget(header(OURS), OURS)).not.toBeNull();
  });

  it.each([
    ["another project", OURS.replace("/1234", "/9999")],
    ["another key", OURS.replace("00000000000000000000000000000000", "11111111111111111111111111111111")],
    ["another host", OURS.replace("o12345.ingest.us", "o99999.ingest.us")],
    ["a non-Sentry host", "https://00000000000000000000000000000000@evil.example.com/1234"],
  ])("refuses %s", (_label, dsn) => {
    expect(tunnelTarget(envelope(dsn), OURS)).toBeNull();
  });

  it("refuses envelopes with no dsn or a malformed header", () => {
    expect(tunnelTarget(envelope(undefined), OURS)).toBeNull();
    expect(tunnelTarget(envelope(42), OURS)).toBeNull();
    expect(tunnelTarget("not json\n{}", OURS)).toBeNull();
    expect(tunnelTarget("", OURS)).toBeNull();
  });

  it("is inert when no DSN is configured", () => {
    expect(tunnelTarget(envelope(OURS), undefined)).toBeNull();
    expect(tunnelTarget(envelope(OURS), "")).toBeNull();
  });
});
