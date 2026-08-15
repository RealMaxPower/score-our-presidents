# Lens Accuracy Audit — Per-President Check

**Spec basis:** v1.2 + v1.3 weight revisions (`lib/lens-presets.ts`, `scripts/compute_rankings.py`)
**Scoring set:** 16 presidents × 9 lenses
**Date:** 2026-08-15
**Reproduce:** `python3 scripts/lens_audit.py`

**Purpose:** Every scoring file carries a `pattern_notes` or `reviewer_notes` claim about how that
president *should* move under the lens presets. Those claims were written before the weight vectors
were applied to the finished score set. This audit checks each one against the computed output and
records which hold, which are false, and why.

---

## Top-line take

1. **The computation is correct.** `scripts/compute_rankings.py` and `lib/rankings-math.ts` produce
   identical category nets and weighted totals; Cat 10 renormalization for Biden and Trump T2 behaves
   per v1.2 §9.4; `lib/__tests__/rankings-math.test.ts` passes. No arithmetic defect was found.

2. **Six of sixteen per-president lens claims were wrong or materially overstated** — Nixon, Reagan,
   Clinton, GW Bush, Trump T1, Trump T2 — and four more (Obama, Biden, Carter, Eisenhower) were
   directionally right but described effects far larger than the ones the framework produces. These
   have been corrected in the scoring files.

3. **Two named calibration tests failed and have been restated** (Section 5.1). Reagan's notes
   required his cross-lens variance to be the largest of any anchor; it is 7th of 16. Trump T1's
   notes required the same and stated that failing it means "framework dual-axis design is failing";
   T1's variance is 11th of 16. Both failures are recorded in full — the prior formulations are
   retained verbatim alongside their results — and each anchor now carries a test the design can
   actually satisfy. Trump T2, which inherited T1's expectation by reference, was restated with it.

4. **Root cause is structural, not a bug** (Section 4). Lenses reweight categories; they cannot change
   the sign of a category net. For the presidents whose value-pluralism signal matters most, the
   signature categories are already scored as net harm, so weighting them *more* heavily pushes those
   presidents *down* under the very lens meant to favor them.

---

## Section 1 — Computed weighted totals

| President | Def | Prog | ClLib | Cons | Libt | Comm | Real | Pop | Intl | Spread |
|-----------|----:|-----:|------:|-----:|-----:|-----:|-----:|----:|-----:|-------:|
| Franklin D. Roosevelt | +3.53 | +2.89 | +2.43 | +3.32 | +2.06 | +3.45 | +3.68 | +3.43 | +3.38 | 1.62 |
| Harry S. Truman | +2.19 | +2.21 | +1.50 | +2.23 | +1.18 | +2.36 | +2.36 | +2.37 | +1.99 | 1.20 |
| Dwight D. Eisenhower | +2.69 | +2.30 | +2.31 | +2.82 | +2.25 | +2.79 | +2.58 | +2.60 | +2.57 | 0.56 |
| John F. Kennedy | +2.99 | +2.74 | +2.75 | +3.14 | +2.69 | +3.20 | +2.80 | +3.12 | +2.91 | 0.51 |
| Lyndon B. Johnson | +0.91 | +2.40 | +0.63 | +0.75 | +0.44 | +1.61 | +0.06 | +1.51 | +0.73 | 2.35 |
| Richard Nixon | −0.29 | +0.94 | −1.03 | −0.62 | −1.43 | −0.12 | −0.23 | +0.13 | +0.10 | 2.37 |
| Gerald Ford | +2.79 | +2.83 | +2.79 | +2.80 | +2.73 | +2.99 | +2.62 | +2.46 | +2.85 | 0.52 |
| Jimmy Carter | +3.04 | +3.15 | +3.33 | +2.93 | +3.35 | +3.12 | +2.76 | +2.35 | +3.19 | 1.00 |
| Ronald Reagan | −0.30 | −1.04 | −0.45 | +0.02 | −0.55 | −0.12 | −0.14 | −0.26 | −0.17 | 1.06 |
| George H.W. Bush | +2.65 | +2.58 | +2.28 | +2.75 | +2.10 | +2.79 | +2.79 | +2.57 | +2.84 | 0.75 |
| Bill Clinton | +1.37 | +1.47 | +1.28 | +1.41 | +1.34 | +1.30 | +1.28 | +1.51 | +1.46 | 0.23 |
| George W. Bush | −2.86 | −2.28 | −3.06 | −2.82 | −3.28 | −2.26 | −3.52 | −2.75 | −2.99 | 1.25 |
| Barack Obama | +2.26 | +2.33 | +1.58 | +2.15 | +1.30 | +2.50 | +1.96 | +2.02 | +2.27 | 1.20 |
| Donald Trump (T1) | −4.76 | −4.61 | −4.93 | −4.73 | −5.02 | −4.99 | −4.34 | −4.74 | −4.86 | 0.69 |
| Joe Biden | +1.91 | +2.09 | +1.92 | +1.84 | +1.94 | +1.98 | +1.64 | +1.51 | +1.98 | 0.57 |
| Donald Trump (T2) | −5.22 | −5.25 | −5.33 | −5.07 | −5.35 | −5.47 | −4.73 | −5.26 | −5.35 | 0.74 |

Rank under each lens (1 = highest), with rank spread:

| President | Def | Prog | ClLib | Cons | Libt | Comm | Real | Pop | Intl | Spread |
|-----------|----:|-----:|------:|-----:|-----:|-----:|-----:|----:|-----:|-------:|
| Franklin D. Roosevelt | 1 | 2 | 4 | 1 | 6 | 1 | 1 | 1 | 1 | 5 |
| Harry S. Truman | 8 | 9 | 9 | 7 | 10 | 8 | 7 | 6 | 8 | 4 |
| Dwight D. Eisenhower | 5 | 8 | 5 | 4 | 4 | 6 | 6 | 3 | 6 | 5 |
| John F. Kennedy | 3 | 4 | 3 | 2 | 3 | 2 | 2 | 2 | 3 | 2 |
| Lyndon B. Johnson | 11 | 6 | 11 | 11 | 11 | 10 | 11 | 10 | 11 | 5 |
| Richard Nixon | 12 | 12 | 13 | 13 | 13 | 13 | 13 | 12 | 12 | 1 |
| Gerald Ford | 4 | 3 | 2 | 5 | 2 | 4 | 5 | 5 | 4 | 3 |
| Jimmy Carter | 2 | 1 | 1 | 3 | 1 | 3 | 4 | 7 | 2 | 6 |
| Ronald Reagan | 13 | 13 | 12 | 12 | 12 | 12 | 12 | 13 | 13 | 1 |
| George H.W. Bush | 6 | 5 | 6 | 6 | 5 | 5 | 3 | 4 | 5 | 3 |
| Bill Clinton | 10 | 11 | 10 | 10 | 8 | 11 | 10 | 11 | 10 | 3 |
| George W. Bush | 14 | 14 | 14 | 14 | 14 | 14 | 14 | 14 | 14 | 0 |
| Barack Obama | 7 | 7 | 8 | 8 | 9 | 7 | 8 | 8 | 7 | 2 |
| Donald Trump (T1) | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 0 |
| Joe Biden | 9 | 10 | 7 | 9 | 7 | 9 | 9 | 9 | 9 | 3 |
| Donald Trump (T2) | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 0 |

Cross-lens variance ranking (score spread, largest first): **Nixon 2.37, LBJ 2.35, FDR 1.62,
GW Bush 1.25, Obama 1.20, Truman 1.20, Reagan 1.06, Carter 1.00, GHW Bush 0.75, Trump T2 0.74,
Trump T1 0.69, Biden 0.57, Eisenhower 0.56, Ford 0.52, Kennedy 0.51, Clinton 0.23.**

---

## Section 2 — Per-president verdicts

| President | Documented lens claim | Computed result | Verdict |
|-----------|----------------------|-----------------|---------|
| **FDR** | A lens (e.g. Libertarian on 4.3) should significantly reweight the high-good/high-harm pattern | Libertarian +2.06 vs Default +3.53; rank 1 → 6 | ✅ Accurate |
| **Truman** | Realist lifts, Libertarian lowers, Progressive mixed | Realist +2.36 (rank 8→7), Libertarian +1.18 (rank 8→10), Progressive +2.21 (rank 9) | ✅ Accurate. Caveat added: he stays below Eisenhower under all nine lenses — no ordering flip |
| **Eisenhower** | Mid-to-high across lenses without dramatic divergence, "in contrast to the high-divergence Reagan anchor" | Ranks 3–8, spread 0.56 (13th of 16) | ⚠️ First half accurate; the Reagan contrast is false on rank (Reagan's rank spread is 1, Eisenhower's is 5) |
| **Kennedy** | *(no lens claim recorded)* | Ranks 2–4, spread 0.51 — one of the most lens-invariant presidents | ➕ Gap; claim added |
| **LBJ** | Substantial divergence: Progressive high, Realist low, Conservative mixed | Progressive +2.40 (rank 11→6), Realist +0.06 (worst), Conservative +0.75; spread 2.35 = 2nd largest | ✅ Accurate — the framework's best-performing lens case |
| **Nixon** | Largest cross-lens variance of any anchor; **Realist ranks him relatively high**; ClLib/Libertarian very low | Largest variance ✅ (2.37). Realist −0.23 = rank 13, *below* his Default rank 12 ❌. ClLib −1.03 / Libertarian −1.43 lowest ✅ | ❌ Realist claim false — corrected |
| **Ford** | Moderate across lenses without dramatic divergence | Ranks 2–5, spread 0.52 | ✅ Accurate |
| **Carter** | Progressive/Communitarian/ClLib/Libertarian high; Realist low; Conservative low | Progressive, ClLib, Libertarian all rank 1 ✅. Communitarian +3.12 = middling ⚠️. Conservative +2.93 = rank 3, not low ⚠️. Populist +2.35 (rank 7) is his worst and went unmentioned | ⚠️ Overstated — corrected |
| **Reagan** | **"High lens-spread anchor"** — variance must be largest of any anchor or the dual-axis design is failing. Conservative HIGH, Realist HIGH, Populist MIXED-HIGH | Spread 1.06 = **7th of 16**; rank spread 1 (tied smallest). Conservative +0.02 is his best ✅ but worth only one rank. Realist −0.14 and Populist −0.26 sit mid-pack ❌ | ❌ **Named calibration test FAILED** — failure recorded, test restated to directional form (§5.1), which passes |
| **GHW Bush** | High on Realist and Internationalist, moderate elsewhere | Realist +2.79 (rank 6→3), Internationalist +2.84 = his best score | ✅ Accurate |
| **Clinton** | Default and Internationalist high; Conservative low; Libertarian mixed | Spread 0.23 = **smallest of all 16**. Rank 10 under Default, Internationalist *and* Conservative; Populist +1.51 is his best score, ClLib +1.28 his worst | ❌ "Conservative low" false; "ranks high" misleading at rank 10 — corrected |
| **GW Bush** | Near bottom across lenses, limited divergence; Realist below Conservative; Libertarian and Progressive both low; PEPFAR lifts him in Internationalist | Rank 14 under all nine ✅. Realist −3.52 < Conservative −2.82 ✅. Libertarian −3.28 low ✅ but Progressive −2.28 is his **2nd-best** lens ❌. Internationalist −2.99 is *below* Default −2.86 — no PEPFAR lift ❌ | ❌ Two claims false — corrected |
| **Obama** | Progressive high; Conservative low; Libertarian/ClLib mixed | Progressive +2.33 is 2nd-best but rank is unchanged at 7. Conservative +2.15 is 0.11 below Default. Libertarian +1.30 and ClLib +1.58 are his genuinely low lenses | ⚠️ Directionally right, magnitudes overstated — corrected |
| **Trump T1** | **Divergence must be largest of any anchor in absolute terms** or the design is failing. Conservative > Default; Populist substantially higher | Spread 0.69 = **11th of 16**; identical rank 15 under all nine. Conservative −4.73 beats Default −4.76 by 0.03. Populist −4.74 beats Default by 0.02, not "substantially" ❌. Realist −4.34 is his actual best lens | ❌ **Named calibration test FAILED** — failure recorded, anchor role reassigned to uniform-harm (§5.1), which passes |
| **Biden** | Progressive high; Internationalist high; Conservative low | Progressive +2.09 is his best score ✅ though his rank *drops* 9→10. Internationalist +1.98 ≈ Default +1.91. His genuinely low lenses are Populist +1.51 and Realist +1.64, neither mentioned | ⚠️ Overstated — corrected |
| **Trump T2** | Conservative and Populist relatively higher; Progressive/Libertarian/ClLib/Internationalist lower | Conservative −5.07 = 2nd best ✅. Populist −5.26 is *below* Default −5.22 ❌. Progressive −5.25 ≈ Default. Realist −4.73 is his best by 0.34, unmentioned | ❌ Populist claim false — corrected; anchor role restated with T1 (§5.1) |

---

## Section 3 — What the lens system actually does

Spearman rank correlation of each lens against Default across the 16 presidents:

| Lens | ρ vs Default | L1 distance of weight vector from Default (max 200) |
|------|-------------:|----------------------------------------------------:|
| Internationalist | 0.997 | 22 |
| Conservative | 0.988 | 34 |
| Communitarian | 0.988 | 28 |
| Realist | 0.971 | 44 |
| Classical Liberal | 0.968 | 36 |
| Progressive | 0.938 | 42 |
| Populist | 0.938 | 42 |
| Libertarian | 0.926 | 54 |

Every lens reproduces the Default ordering at ρ ≥ 0.93. Ten of the sixteen presidents move by two
ranks or fewer across the entire lens set; three (GW Bush, Trump T1, Trump T2) do not move at all.

---

## Section 4 — Why divergence collapses

Three compounding causes, none of them an implementation defect:

**1. Category nets are strongly correlated.** Mean pairwise Pearson correlation between the 13
category nets across the 14 presidents with a complete Cat 10 is **r = 0.52**, and 51% of category
pairs correlate above 0.5. A president scored well in one category tends to be scored well in most.
Any convex reweighting of strongly correlated columns reproduces roughly the same ordering — that is
a property of the score matrix, not of the weights.

**2. Lens vectors are close to each other.** Every lens assigns nonzero weight to all 13 categories,
and the largest divergence from Default (Libertarian) moves only 54 of a possible 200 L1 points.
Internationalist moves 22. These are perturbations of a common expert prior, not competing priors.

**3. Lenses reweight, they cannot re-sign.** This is the binding constraint, and it bites hardest
exactly where the project's value-pluralism claim is loudest. Trump T1's Cat 13 net is −6.2 and
Cat 12 is −6.0; T2's are −7.2 and −6.8. The Populist lens puts 14% on Cat 13 and 11% on Cat 12 — so
weighting a populist's signature priorities *more* heavily makes Trump score *worse*, which is why
Populist lands below Default for both terms. A populist evaluator does not merely weight immigration
enforcement higher; they score restrictionist enforcement as good. The single good/harm axis fixes
that valence for every lens, capping achievable divergence for the presidents where lens choice
should matter most.

The same mechanism explains Reagan: his Cat 1 net is −2.2, and the Conservative and Populist lenses
each put 13% on Cat 1, offsetting the Cold War (Cat 2 +2.8) and morale (Cat 12 +4.0) strength those
lenses are supposed to reward.

Where the score matrix *does* contain genuine cross-category sign conflict, the lens system works as
designed: LBJ (Cat 3 +3.6, Cat 5 +8.5 against Cat 2 −5.0) moves five ranks between Progressive and
Realist, and Nixon (Cat 6 +6.8 against Cat 8 −3.3, Cat 4 −7.0) produces the widest spread in the set.

---

## Section 5 — Recommendations

### 5.1 Applied — the two failing tests are restated

Both failing conditions were zero-sum superlatives: "largest cross-lens variance of any anchor." Only
one of 16 presidents can hold that, so the condition is decided by the rest of the score set rather
than by anything about the anchor under test, and at least one such test is guaranteed to fail however
well the framework performs. Nixon holds the largest variance at 2.37.

**Reagan — restated to directional form.** The test now reads: Conservative must be his
highest-scoring lens and Progressive his lowest. That is the substantive claim the anchor was built to
make — Cold War endgame and restored morale pulling against the HIV/AIDS response, inequality and
environmental rollback, such that lens choice decides whether he nets positive. It does not require
the pull to be large. **Passes:** Conservative +0.02 (his only positive total), Progressive −1.04
(his lowest). The two additional expectations that failed on their own terms — Realist HIGH and
Populist MIXED-HIGH — are withdrawn rather than restated; both land mid-pack because the Conservative
and Populist vectors each put 13% on Cat 1, and his −2.2 there cancels Cat 2 (+2.8) and Cat 12 (+4.0).

**Trump T1 — anchor role reassigned.** T1's prior role was unreachable rather than merely unmet. All
13 of his category nets are negative (−1.8 to −8.2); a lens vector is a set of non-negative weights
summing to 100, so every lens returns a weighted mean of thirteen negative numbers inside that same
range. No reweighting produces large divergence, and none lifts him past a president with positive
nets. He is therefore recorded as a **uniform-harm anchor**, tested on rank 15-or-16 under all nine
lenses with spread below 1.0. **Passes:** rank 15 under all nine, spread 0.69. Divergence requires
sign conflict across categories, which T1's pattern does not contain and Reagan's does — so the
divergence anchor now sits with Reagan alone.

**Trump T2 — restated with T1**, whose expectation it inherited by reference ("divergence expected
similar to T1"). All 12 of his scored nets are negative and Cat 10 is dropped, removing one of the
two categories the lens vectors spread most widely on. **Passes** as a uniform-harm anchor: rank 16
under all nine, spread 0.74.

In all three files the prior formulation is retained verbatim with its failing result. Scores were not
touched — `scripts/compute_rankings.py` output is byte-identical before and after.

### 5.2 Open — methodology decisions not taken here

1. **Publish the lens-divergence figures alongside the lens selector.** The site lets a reader switch
   lenses; it does not tell them that eight of nine orderings are ≥0.93 correlated with the default.
   Stating the spread per president is more honest than letting the selector imply larger effects.

2. **Sharpen the lens vectors if larger divergence is wanted.** Allowing near-zero weights on
   categories a tradition genuinely disregards would widen L1 distance well beyond the current 22–54.
   This is defensible per-tradition but changes every published ranking.

3. **The only structural fix for causes (1) and (3) is a per-lens valence layer** — letting a lens
   invert the sign of specified sub-criteria (e.g. Populist scoring 13.2 enforcement as good). That is
   a v2 spec change with large blast radius, and it trades a single defensible fact base for nine.
   Recorded as an option, not a recommendation.
