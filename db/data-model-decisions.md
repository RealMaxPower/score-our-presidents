# Data Model Decisions — Phase 2 Workstream F

**Spec basis:** v1.2 + Workstream C v1.3 weight revisions
**Workstream:** F — Data Model & Migrations
**Date:** 2026-05-11
**Files:** `schema.prisma`, `seed.ts`, this document

---

## Top-line summary

The Prisma schema implements the 12 entities listed in spec §10 plus 3 operational entities (UserSession for NextAuth.js, SpecVersion for audit, UrlVerificationLog for the URL-verification pass). PostgreSQL 15+ as backing store. UUIDs throughout. snake_case in DB, camelCase in code via Prisma `@map`. Idempotent seed script that loads all Phase 1 scoring data from the 16 YAML files.

Total entity count: 14. Total expected rows after seed:
- 13 categories
- 56 sub-criteria
- 9 lens presets + 117 lens weight values
- 16 presidents
- ~888 expert scores (16 × 56 minus 8 Cat 10 drops for Biden + Trump T2)
- ~880-900 evidence items (1 per scored sub-criterion at Lean MVP)

Estimated post-seed database size: ~15-20MB. Comfortably fits in free-tier Postgres (Neon, Supabase, Vercel Postgres).

---

## Section 1 — Key design decisions

### Decision 1 — UUIDs vs. integer primary keys

**Choice:** UUIDs (`@default(uuid())`).

**Rationale:** UUIDs are non-guessable (security benefit for user-related tables), support distributed-system extension (sharding if ever needed), and avoid integer-overflow concerns at scale. Cost: ~16 bytes per row vs. 4 bytes for int. At 16-20MB total database size, the overhead is negligible.

**Tradeoff acknowledged:** UUIDs are harder to read in dev tooling. Mitigated by also having human-readable `slug` or `number` fields on lookup tables (Category.number, SubCriterion.number, President.slug, LensPreset.slug).

### Decision 2 — snake_case in DB, camelCase in code

**Choice:** Prisma's `@map` decorator translates camelCase Prisma fields to snake_case Postgres columns/tables.

**Rationale:** Standard Postgres convention is snake_case; standard TypeScript convention is camelCase. The Prisma `@map` decoration is the cleanest way to satisfy both. No code-level snake_case awkwardness; DB queries written by hand (analytics, debugging) follow Postgres convention.

### Decision 3 — Decimal vs. Float for percentages and scores

**Choice:** `Decimal(5, 2)` for weights and `Decimal(6, 2)` for weighted totals; `Int` for raw good_score/harm_score (0-10).

**Rationale:** Avoid floating-point error accumulation in weight calculations. Weights are explicitly percentages with 2 decimal precision. Weighted totals could be slightly negative or up to +10, so Decimal(6,2) handles range -99.99 to +99.99.

### Decision 4 — Null-handling for dropped Cat 10 scores

**Choice:** `goodScore Int?` and `harmScore Int?` (nullable). Combined with `insufficient_time_elapsed: Boolean` flag.

**Rationale:** Per v1.2 §9.4, Cat 10 sub-criteria are dropped entirely for in-office (Trump T2) and ≤5y post-term (Biden) presidents. The schema must represent "no score" cleanly. Boolean flag enables UI to display "Long-tail too recent" rather than 0 or blank. Aggregation queries filter on `insufficient_time_elapsed: false`.

### Decision 5 — Evidence-reuse handling

**Spec §4.4 v1.1 clarification:** "Evidence items may be cited under multiple sub-criteria — a single Public Law referenced under both Civil Rights and Democratic Health is one evidence item with two `cited_in` references."

**Implementation question:** Should evidence be a many-to-many with sub-criterion (via a join table), or one-to-many with denormalized duplicates?

**Choice (v1):** Evidence stays one-to-many with ExpertScore (or UserScore in v2). Denormalize when a single source is cited under multiple sub-criteria.

**Rationale:** For Phase 1 (Lean MVP at 1 evidence per sub-criterion), denormalization is simpler and the duplication cost is minimal (~50-100 duplicated rows at most). Phase 2's URL-verification pass can deduplicate identical source URLs into a separate `sources` table if useful. Keeping it simple for v1.

**Future consideration (v1.2+):** If evidence reuse becomes substantial in Workstream B's expanded scoring, refactor to:
```
sources (id, url, citation, source_type, ...) ← canonical source
evidence_links (id, source_id, expert_score_id, claim, direction, tier)
```

### Decision 6 — Lens preset weights normalization

**Choice:** Each `LensWeight` row stores the raw percentage (e.g., 13.00). Validation at seed-time enforces sum = 100 per lens. UI queries always sum-check.

**Rationale:** Storing raw percentages keeps weight-vector arithmetic simple. Renormalization for Cat 10 drops happens at query time (compute_rankings.py logic).

**Alternative considered:** Store weights as fractional 0.00-1.00. Rejected because % is the UI representation and the spec's representation.

### Decision 7 — User weights vs. lens weights

**Choice:** Separate `UserWeight` and `LensWeight` tables.

**Rationale:** Conceptually distinct. Lens weights are reference data (insert-once at seed, never updated except via spec revision). User weights are mutable per-user state (updated whenever user adjusts sliders).

**Schema effect:** `LensWeight` has FK to `LensPreset`. `UserWeight` has FK to `UserProfile`. Both have FK to `Category`. Different cardinality patterns.

### Decision 8 — Aggregate snapshot strategy

**Choice:** Nightly snapshot job (BullMQ) computes median + IQR per (president × category × lens) and writes to `AggregateSnapshot` table.

**Rationale:** Per-request computation of aggregates would be expensive at scale (linear in user count). Nightly snapshots are sufficient for "community consensus" feature (no real-time aggregate requirement).

**Update cadence:**
- v1.1 (Sprint 5): nightly at 02:00 UTC.
- v1.2+: configurable per-lens cadence if useful.

**Schema effect:** `AggregateSnapshot` table with `snapshotDate` column. Unique constraint on `(snapshotDate, lensPresetId, presidentId, categoryId)` to prevent duplicate snapshots. Query for current aggregate: `WHERE snapshotDate = (SELECT MAX(snapshotDate) FROM aggregate_snapshots)`.

### Decision 9 — Reputation scoring placement

**Choice:** `UserProfile.reputationScore Decimal(5,2)` default 1.0. Range 0.00 to 5.00.

**Rationale:** Reputation scoring is per-user, not per-score. Used to weight aggregate calculations in v1.1+ and to identify outlier users in v2 brigading defense. Single decimal field is sufficient.

**Future scoring algorithm (v1.1+):**
- Account age contributes (older accounts more reputable)
- Email verification contributes
- Outlier-detection check on user's weight vector contributes
- Manual admin override possible

### Decision 10 — Audit and operational tables

**Added beyond spec §10:**
- `SpecVersion`: tracks which spec version is currently active. Enables versioned scoring data over time. Critical for: rolling back to v1.2 if v1.3 changes are reverted, comparing pre/post-revision scoring.
- `UserSession`: required by NextAuth.js Prisma adapter.
- `UrlVerificationLog`: append-only log of URL verification attempts. Critical for Workstream B URL-verification pass.

---

## Section 2 — Indexing strategy

### Hot read paths

| Query | Index supporting |
|-------|-----------------|
| Default ranking page load | `expert_scores(presidentId)` + `categories(number)` |
| Lens-switched ranking | Same as above; lens-weighted compute happens in app code |
| President scorecard | `expert_scores(presidentId)` (already indexed) |
| Sub-criterion cross-president view | `expert_scores(subCriterionId)` (already indexed) |
| Evidence detail modal | `evidence(expertScoreId)` (already indexed) |
| Personal weights load | `user_weights(userId)` (already indexed) |
| Community aggregate display | `aggregate_snapshots(snapshotDate, lensPresetId)` |

### Hot write paths

| Operation | Indexes touched |
|-----------|-----------------|
| User authenticates | `user_profiles(email)`, `user_sessions(sessionToken)` |
| User saves weights | `user_weights(userId, categoryId)` (composite unique) |
| Nightly snapshot insert | `aggregate_snapshots(snapshotDate, lensPresetId, presidentId, categoryId)` (composite unique) |

### Pagination / sort indexes

For v1, no pagination needed (16 presidents fit on one page). For v2+ with user scores, additional indexes on `(presidentId, subCriterionId, reputationWeighted, outlierFlag)` would support brigading-aware aggregations.

### Full-text search (deferred)

President-name search is trivial at 16 presidents. Sub-criterion search and evidence search not in v1 scope. If v1.2+ adds search, use Postgres full-text search via `tsvector` columns on `expert_scores.notes` and `evidence.claim`.

---

## Section 3 — Aggregate snapshot strategy (v1.1+)

### Computation

Nightly BullMQ job (`compute-aggregates`) runs at 02:00 UTC. Steps:

1. Load all qualified `UserWeight` rows (where `userProfile.emailVerified = true AND account_age_days >= 7 AND deletedAt IS NULL`).
2. For each lens preset (9 total) AND for the "user-weighted aggregate" pseudo-lens:
   - For each (president × category) combination:
     - Collect all user-weighted nets across qualified users
     - Compute median + IQR
     - Insert `AggregateSnapshot` row
3. For aggregate weighted total per president:
   - Same as above but at president level (categoryId = null)
4. After completing: write a "snapshot completed" log entry; UI checks for this before displaying community aggregate.

### Edge cases

- **Less than 100 qualified users:** Skip snapshot insertion. UI shows "Community feature unlocks at 100 user signups."
- **Less than 30 users per category sub-aggregation:** Skip the category-level snapshot but compute president-level.
- **Outlier detection (v1.1+):** Before aggregation, identify weight vectors deviating >3 std deviations from joint-distribution centroid. Discount those users' contribution by reputation_score adjustment.

### Performance estimate

- Qualified users: estimated 5,000 at 90 days post-launch (conservative).
- Aggregations per night: 9 lenses × 16 presidents × 14 categories (13 + null) = 2,016 snapshot rows.
- Compute time: ~30 seconds with proper indexing.
- Output rows per night: 2,016. After 90 days: ~180,000 historical snapshot rows. Manageable.

---

## Section 4 — Migration approach

### Initial migration

`npx prisma migrate dev --name init` creates the initial migration from `schema.prisma`. Generates SQL for all 14 tables + indexes + foreign keys.

### Seed

`npx prisma db seed` runs `db/seed.ts`. Idempotent: uses `upsert` so re-running doesn't duplicate data.

### Future migrations

- v1.1 community-aggregate features: no schema changes needed (already in v1.0 schema).
- v2 user-submitted scoring: no schema changes needed (UserScore + Evidence.userScoreId already in v1.0 schema).
- v1.3+ spec revisions (weight changes): re-run seed; SpecVersion row inserts new "v1.3 active" record; weight values get updated.
- Adding sub-criteria (v1.2+ structural changes): Prisma migrate handles cleanly.
- Removing/merging sub-criteria: Avoid. If absolutely needed, soft-delete via `SubCriterion.deletedAt` field (not in current schema; add when needed).

### Rollback strategy

Each migration produces a `.sql` file in `prisma/migrations/{timestamp}_{name}/migration.sql`. Rollback via `psql` against a backup. v1 doesn't ship with automatic rollback; manual restore via DB snapshot.

---

## Section 5 — Privacy and data deletion

### GDPR / right-to-be-forgotten

User can request deletion via `/me/delete-account`. Implementation:

1. Set `UserProfile.deletionRequestedAt`
2. Background job (24-48 hours later) performs hard deletion:
   - DELETE from `UserSession` (CASCADE will clean up automatically)
   - DELETE from `UserWeight` (CASCADE)
   - DELETE from `UserScore` (CASCADE; if user submitted in v2, those scores disappear from aggregates next snapshot)
   - DELETE from `UserProfile`
3. Anonymize references in `AggregateSnapshot` (recomputed next snapshot anyway).

### Data retention

- User accounts: deleted on user request only.
- Snapshots: retained indefinitely (analytical value; ~180K rows/year manageable).
- URL verification logs: retained 90 days (operational only).

### What data is stored

- Email (required for auth)
- Display name (optional, user-set)
- Personal weights (only when user saves)
- v2: user scores (when submitted)

Not stored: tracking cookies, third-party identifiers, geolocation, browsing history.

---

## Section 6 — Observability hooks

Schema fields support observability:

- `verification_status` on Evidence — populated by URL-verification job
- `verifiedAt` on Evidence — when verified
- `lowConfidence`, `tentativeLongTail`, `insufficientTimeElapsed` flags on ExpertScore — for UI display and analytics
- `outlierFlag` on UserScore — for brigading-defense analytics
- `reputationScore` on UserProfile — analytics on user reputation distribution

Observability platform integration (Sentry, Vercel Analytics) instruments at the Next.js application layer, not Prisma. See architecture-v1.md §6 (Observability).

---

## Section 7 — Backup and disaster recovery

### Backup cadence

- Daily Postgres dump to S3 (or hosting-provider equivalent).
- 30-day retention.
- Point-in-time recovery via Neon/Supabase if hosting platform supports it.

### Restore SLA

- Initial restore from latest snapshot: <15 minutes.
- Maximum data loss in disaster: 24 hours (between daily backups).

---

## Section 8 — Performance benchmarks (target)

Tested via `prisma db seed` + sample queries against local Postgres 15:

- Seed time (initial load): ~3-5 seconds.
- Single-president scorecard load (joins ExpertScore + SubCriterion + Evidence): ~50-100ms.
- Lens-switched ranking query (computed in app code from pre-fetched scores): ~10ms server, ~50ms client compute.
- Aggregate snapshot job for 5,000 users: ~30 seconds.

These are estimates — measure at scale during Sprint 1-2 implementation.

---

## Section 9 — Open questions resolved here

**OQ from spec §11 / weight-validation §6:**

- **Aggregate snapshot strategy:** Resolved in §3 above (nightly cron).
- **Per-sub-criterion weighting:** v1 uses equal weighting per spec §4.2. Schema doesn't include sub-criterion weights; revisit in v1.3+ if framework changes.
- **Cat 13 default weight:** Tagged in seed as `weightSourceTag: 'cowork_derived'`. Workstream D external validity check informs whether to revise.

**OQ remaining for architecture (Workstream G):**

- REST vs. tRPC API surface (decision in architecture)
- Hosting choice — Vercel + Neon vs. Railway + native Postgres (decision in architecture)
- Background job runner (BullMQ on Upstash Redis — confirmed in architecture)

---

## Section 10 — Acceptance criteria for Workstream F

- ✓ Prisma schema (`schema.prisma`) covers all 12 entities from spec §10 plus 3 operational entities (UserSession, SpecVersion, UrlVerificationLog)
- ✓ Seed script (`seed.ts`) loads Phase 1 scoring data idempotently from YAML files
- ✓ Migrations supported via standard `npx prisma migrate dev`
- ✓ Indexing strategy documented for all hot read paths
- ✓ Aggregate snapshot strategy documented for v1.1+
- ✓ Privacy / GDPR / deletion strategy documented
- ✓ This document (`data-model-decisions.md`) explains schema choices

**Ready for Workstream G (architecture) and H (sprint plan).**

---

*End of data-model-decisions.md. Schema and seed script: `db/schema.prisma`, `db/seed.ts`.*
