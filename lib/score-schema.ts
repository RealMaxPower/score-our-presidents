// Zod schema for the scores/*.yaml evidence corpus.
//
// Nothing validated the YAML structure before this: db/seed.ts uses `?? default`
// fallbacks for every field, so a typo'd key (e.g. `verifcation_status`) would
// silently seed as `pending` forever and go undetected. This schema is the
// structural contract; lib/__tests__/scores-schema.test.ts runs it against all
// 16 files in the existing CI `node` job.
//
// The structured core (category / sub-criterion / evidence) is `.strict()` so
// unknown keys fail loudly. Top-level president metadata and calibration_summary
// are intentionally loose (`.passthrough()`) — authors add ad-hoc note fields
// there (recency_note, scoring_confidence_note, …) and that surface is not part
// of the verification campaign's integrity contract.

import { z } from "zod";

// URL-liveness status. `shallow` (2xx on a bare origin) and the others are
// written by scripts/verify-urls.ts. This is NOT factual verification — see
// `factCheckSchema` below.
export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "shallow",
  "failed",
  "not_applicable",
] as const;

export const SOURCE_TYPES = [
  "academic",
  "journalism",
  "primary_document",
  "statistic",
  "historical_record",
] as const;

// Factual-accuracy verdict (Track B). Deliberately avoids the word "verified"
// so it can never be confused with the URL-liveness `verification_status`.
export const FACT_CHECK_STATUSES = [
  "supported",
  "partial",
  "unsupported",
  "cant_verify",
] as const;

/** `source_url` is either the literal "canonical" marker or a real http(s) URL. */
const sourceUrlSchema = z.string().refine(
  (v) => {
    if (v === "canonical") return true;
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: 'source_url must be "canonical" or a valid http(s) URL' }
);

export const factCheckSchema = z
  .object({
    status: z.enum(FACT_CHECK_STATUSES),
    confidence: z.enum(["high", "medium", "low"]).optional(),
    checked_by: z.enum(["agent", "human"]).optional(),
    checked_at: z.string().optional(),
    note: z.string().optional(),
    suggested_fix: z.string().optional(),
  })
  .strict();

export const evidenceSchema = z
  .object({
    citation: z.string().optional(),
    source_url: sourceUrlSchema,
    source_type: z.enum(SOURCE_TYPES),
    tier: z.number().int().min(1).max(4),
    claim: z.string(),
    direction: z.enum(["good", "harm"]),
    verbatim_quote: z.string().optional(),
    verification_status: z.enum(VERIFICATION_STATUSES),
    fact_check: factCheckSchema.optional(),
  })
  .strict();

const score = z.number().min(0).max(10).nullable();

export const subCriterionSchema = z
  .object({
    id: z.string().regex(/^\d+\.\d+$/, 'id must look like "5.3"'),
    name: z.string(),
    good_score: score,
    harm_score: score,
    low_confidence: z.boolean().optional(),
    insufficient_time_elapsed: z.boolean().optional(),
    tentative_long_tail: z.boolean().optional(),
    partial_term_long_tail: z.boolean().optional(),
    era_context: z.string().optional(),
    score_status: z.string().optional(),
    notes: z.string().optional(),
    // Invariant Track A's write-back key (slug, sub_id) relies on: at most one
    // evidence entry per sub-criterion. Empty (era-N/A 0/0) is allowed.
    evidence: z.array(evidenceSchema).max(1).optional(),
  })
  .strict();

export const categorySchema = z
  .object({
    category: z.number().int().min(1).max(13),
    name: z.string(),
    category_notes: z.string().optional(),
    insufficient_time_elapsed: z.boolean().optional(),
    sub_criteria: z.array(subCriterionSchema),
  })
  .strict();

export const presidentScoreSchema = z
  .object({
    president: z.string(),
    display_name: z.string(),
    categories: z.array(categorySchema),
  })
  // President metadata + calibration_summary are freeform; don't fail on the
  // ad-hoc note fields authors add there.
  .passthrough();

export type EvidenceYaml = z.infer<typeof evidenceSchema>;
export type PresidentScoreYaml = z.infer<typeof presidentScoreSchema>;
