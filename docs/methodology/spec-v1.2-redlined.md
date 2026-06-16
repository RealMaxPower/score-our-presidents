# Modern Presidential Scoring Framework — v1.2 Redline

**Base:** v1.1
**Revision:** v1.2 (2026-05-11)
**Approver decisions locked:** All six structural changes from Workstream A approved by Marshall Cahill
**Status:** Workstream A output. Ready for anchor scoring against this base.

---

## Changelog (summary)

Six structural changes approved by Marshall Cahill:

| # | Change | Sections affected |
|---|--------|-------------------|
| 1 | Added Cat 13 — Immigration & demographics (4 sub-criteria) | §3, §6, §7, §10 |
| 2 | Split 8.4 into 8.4–8.7 (judicial appointments expanded) | §3 |
| 3 | Added 3.5 — Tribal & indigenous policy | §3 |
| 4 | Calibration anchors expanded from 3 to 5 (added Truman, Reagan) | §2, §4.5 |
| 5 | Added Populist and Internationalist lens presets (6 → 8 lenses) | §7 |
| 6 | Declined Christian Nationalist lens with documented rationale | §7 |

Plus non-structural items folded in:

| # | Change | Sections affected |
|---|--------|-------------------|
| 7 | New: §4.6 Multi-category event attribution rule | §4 |
| 8 | Category notes tightened: Cat 1.3 (fiscal vs. growth), Cat 12.1 (morale vs. economy) | §3 |
| 9 | Lens descriptions tightened: Libertarian's Hayekian framing for institutional integrity | §7 |
| 10 | Cross-cutting guidance added for tech, trade, pandemic, federalism, veterans | §3 (category notes) |
| 11 | All Cat 13 weights and renormalized lens vectors marked preliminary pending Workstream C | §6, §7 |

Deferred to Phase 1.5 (separate deliverable, not in this redline):

- Per-era benchmark appendix for the 6 most era-dependent categories (Cat 2, 3, 4, 6, 9, 11). Will be produced as `era-benchmarks-v1.md` between Workstream A close and anchor scoring start, so anchor scoring runs against the benchmarks.

**Net structural state:** 13 categories, 56 sub-criteria, 8 lens presets + default, 5 calibration anchors.

---

## §2 Scope — MODIFIED (anchor markers added)

**v1.1 text:** Table of 16 presidents with no anchor marking.

**v1.2 text:** Same 16 presidents; the calibration anchors are now marked in a new column. Table:

| # | President | Years | Party | Anchor |
|---|-----------|-------|-------|:------:|
| 1 | Franklin D. Roosevelt | 1933–1945 | D | ★ |
| 2 | Harry S. Truman | 1945–1953 | D | ★ |
| 3 | Dwight D. Eisenhower | 1953–1961 | R | ★ |
| 4 | John F. Kennedy | 1961–1963 | D | |
| 5 | Lyndon B. Johnson | 1963–1969 | D | |
| 6 | Richard Nixon | 1969–1974 | R | ★ |
| 7 | Gerald Ford | 1974–1977 | R | |
| 8 | Jimmy Carter | 1977–1981 | D | |
| 9 | Ronald Reagan | 1981–1989 | R | ★ |
| 10 | George H.W. Bush | 1989–1993 | R | |
| 11 | Bill Clinton | 1993–2001 | D | |
| 12 | George W. Bush | 2001–2009 | R | |
| 13 | Barack Obama | 2009–2017 | D | |
| 14 | Donald Trump (T1) | 2017–2021 | R | |
| 15 | Joe Biden | 2021–2025 | D | |
| 16 | Donald Trump (T2) | 2025– | R | |

---

## §3 The Categories — MODIFIED (13 categories, 56 sub-criteria)

**v1.1 had 12 categories, 48 sub-criteria.** v1.2 has 13 categories, 56 sub-criteria, reflecting the three structural additions/splits approved.

Categories 1, 2, 4, 5, 6, 7, 9, 10, 11, 12 are unchanged from v1.1. Modified categories are detailed below.

### Category 3 — Civil Rights & Equality (MODIFIED: +1 sub-criterion)

- 3.1 Racial equity
- 3.2 Gender equity
- 3.3 LGBTQ+ rights
- 3.4 Disability & other protected classes
- **3.5 Tribal & indigenous policy** *(new in v1.2 — was previously folded ambiguously into 3.4)*

Category note: Federal-tribal relations have a distinct legal and historical character (treaty relationships, sovereignty, federal trust responsibility) that doesn't fit cleanly with the "disability and other" catchall. 3.5 covers consultation practices, land/water/treaty-rights decisions, ICWA-related policy, treatment of tribal sovereignty in federal action, and material outcomes for tribal nations during the administration.

### Category 8 — Institutional Integrity (MODIFIED: 8.4 split into 8.4–8.7)

- 8.1 Personal ethics & conduct in office
- 8.2 Administration ethics (Cabinet, family, appointees)
- 8.3 Norm adherence (precedent, peaceful transition, prosecutorial independence)
- **8.4 Judicial appointment quality** *(was previously the first dimension of v1.1's 8.4)* — academic/professional caliber of appointees, jurisprudential rigor, professional reputation pre-appointment
- **8.5 Judicial appointment selection ethics** *(new in v1.2)* — vetting transparency, conflicts of interest, lobbying-organization influence on shortlists, ABA rating posture
- **8.6 Judicial activism vs. restraint posture** *(new in v1.2)* — does the president appoint judges seen as innovating beyond established law (in either direction), or judges who follow precedent and limit themselves to written text? Scored on perception across the legal academy, not on outcome direction
- **8.7 Confirmation-process conduct** *(new in v1.2)* — adherence to Senate norms during confirmation (e.g., blockade tactics, pre-election confirmations, hearings transparency, recess appointments, court-packing attempts)

Category note on 8.4–8.7: These sub-criteria intentionally separate four dimensions that v1.1 collapsed. A president can appoint high-quality judges (high 8.4) using an ethically compromised process (low 8.5) — e.g., a heavily ideological pipeline that produces academically distinguished but pre-selected nominees. Score each dimension independently.

### Category 13 — Immigration & Demographics (NEW in v1.2)

- 13.1 Legal immigration policy — caps, categories (family/skilled/diversity), refugee admission ceilings, posture on H-1B and other employment-based programs, treatment of legal immigrants in administration
- 13.2 Enforcement & treatment of unauthorized migrants — interior enforcement priorities, border enforcement, detention policy, deportation practices, family-separation policy, posture on local cooperation (sanctuary cities, 287(g))
- 13.3 Refugee & asylum policy — admission numbers, processing speed and fairness, treatment of asylum seekers at the border, posture on Convention obligations, country-specific cap setting
- 13.4 Demographic and labor-market impact — material effects of immigration policy on US labor markets, fiscal impact (federal/state), demographic outcomes (composition, integration), long-tail labor-force effects

Category note: This category captures decisions in the immigration-policy domain. Some second-order effects (e.g., how immigration enforcement affected racial dynamics) will also be referenced in Cat 3, and some economic effects (e.g., labor supply implications) in Cat 1 — per §4.6, score the most direct effect under Cat 13 and note cross-category effects elsewhere without rescoring.

Category-level cross-cutting notes (v1.2 additions for clarity, no new scoring):

- **Technology policy** is cross-cutting. Score under 4.1 (speech/platform regulation), 4.2 (surveillance/encryption), 1.x (antitrust, AI economic impact), 5.x (telemedicine), 8.x (interference with science agencies). Surface in category notes wherever it matters; no Cat 14.
- **Trade policy** is cross-cutting. Score under 2.2 (alliance management, multilateral agreements) and 1.x (domestic outcomes).
- **Pandemic / health-emergency response** is cross-cutting. Score under 7 (crisis management) and 5.1 (health-system effects). Both attributions allowed per §4.6.
- **Federalism / federal-state relations** — score under 8.3 (norm adherence) where the action touches federal-state norms; under 9.1 (voting access) where federal-state tension affects elections; under 7.x where it affects crisis response.
- **Veterans affairs** — score under 5.3 (safety net) and 2.x (downstream of war).
- **Native American / tribal policy** — now has its own sub-criterion 3.5.
- **Fiscal vs. growth disambiguation (Cat 1.3 note):** Fiscal trajectory (deficits, debt, fiscal posture) is *not* the same as growth/employment (1.1). Reagan: 1.1 high, 1.3 low. Clinton: 1.1 high, 1.3 high. Trump T1: 1.1 high, 1.3 low. Score independently.
- **Morale-from-economy disambiguation (Cat 12.1 note):** Domestic morale captures *psychological/cultural* dimensions — the felt experience of citizens about the state of the country. The portion of morale that's downstream of economic outcomes is already captured in Cat 1. Score in 12.1 only the increment that reflects cultural/national sentiment beyond what Cat 1 explains.

**Total: 13 categories, 56 sub-criteria.**

---

## §4.5 Anchor presidents — MODIFIED (3 → 5 anchors)

**v1.1 text:** Three anchors (FDR, Nixon, Eisenhower). The editorial team drafts; Marshall Cahill approves; external review for promotion.

**v1.2 text:** Five anchors. Same procedure (the editorial team drafts, Marshall Cahill approves, external review for promotion). The expansion adds:

- **Truman** — early Cold War; contested historiographic position (mid-tier in some rankings, top-tier in others); anchors "good with significant controversies in a pivotal era". Bookend for FDR's New Deal/WWII calibration into the early postwar period.
- **Reagan** — contested-recent; historiographic consensus divides by ideology; anchors "high variance between lenses". Provides the only recent-era anchor (post-1980), substantially improving calibration for the most-contested scoring later (Clinton, Bush 43, Obama, Trump T1, Biden).

The five-anchor set spans:

| Anchor | Era | Score-range role | Variance role | Lens-spread role |
|--------|-----|------------------|---------------|------------------|
| FDR | Pre/during WWII | High good with notable harms | High variance (internment, court-packing) | Modest — D consensus high |
| Truman | Early Cold War | Mid-to-high contested | Medium variance | Modest — D contested |
| Eisenhower | Cold War mid | Mid-high steady | Low variance | Low — R consensus moderate |
| Nixon | Cold War late | Mixed with disgrace | High variance | Modest — R consensus low-mid |
| Reagan | Cold War late / unipolar onset | High contested | High by lens | **High — sharply diverges by lens** |

Why this set: Reagan adds the lens-spread dimension explicitly (his scores diverge most across Conservative/Libertarian vs. Progressive/Social Democratic, which is exactly the variance the framework is designed to surface). Truman fills a temporal gap and adds an early-Cold-War contested-mid-tier reference.

Drafting procedure unchanged from v1.1: the editorial team drafts using primary sources + published rankings as sanity checks; Marshall Cahill approves; anchors labeled "draft pending external review" until a qualified external reviewer validates.

---

## §4.6 Multi-category event attribution rule — NEW

Many of the most consequential presidential actions affect multiple categories. Without an explicit attribution rule, single events can be penalized (or rewarded) across 3–5 categories, inflating the magnitude of major actions and producing implicit double-counting.

**Rule:**

1. **Score the action under the *most direct* category** — the one whose sub-criterion most precisely names what the action did. Watergate is most directly an institutional integrity scandal (8.3 norm adherence) and a transparency issue (4.4). Score there.
2. **Reference cross-category effects in category notes, not in scores.** Watergate's effect on press relationships (9.2), on decorum (11.1), and on long-tail institutional damage (10.2) gets noted in the relevant category_notes for transparency, but does not produce separate score deductions there.
3. **Distinct *outcomes* of the same action are not double-counting.** The Iraq War caused harm to Iraqis (2.4 civilian impact) AND damaged US international standing (12.3 international standing). These are different effects, both real, both scored. Distinguish "the action itself" from "the perception consequence of the action".
4. **For exceptionally cross-cutting events**, up to two attributions are permitted with a documented rationale. Watergate could be scored at both 8.3 (most direct) and 4.4 (the procedural mechanism: covering up surveillance and obstructing investigations). January 6 could be scored at both 8.3 (norm adherence) and 9.3 (political violence — distinct mechanism). Two is the cap; document why each attribution is independent.

**Worked example — January 6, 2021:**

| Sub-criterion | Direct attribution? | Treatment |
|---------------|--------------------|-----------|
| 8.3 Norm adherence | Yes — most direct (rejection of peaceful transition) | Score impact here |
| 9.3 Political violence | Yes — distinct mechanism | Score impact here (within the §4.6 two-cap rule) |
| 11.2 Rhetoric & tone | Indirect — the rhetoric was upstream | Note only; no separate score |
| 8.1 Personal ethics | Indirect | Note only |
| 10.2 Institutional damage | Long-tail consequence, not direct action | Score the long-tail dimension separately under 10.2 (forward-looking) |

This rule applies to expert (editorial-team-drafted) scoring and to user-submitted scoring under Layer 5 if ever shipped.

---

## §6 Default Expert Weights — MODIFIED (13-category renormalization)

**v1.1 default weights:** 12 categories summing to 100%.

**v1.2 default weights:** 13 categories summing to 100%. Cat 13 (Immigration) assigned 7%. Other categories renormalized down proportionally with integer rounding, preserving the original priority ordering as much as possible.

| # | Category | v1.1 Weight | v1.2 Weight | Δ |
|---|----------|------------:|------------:|--:|
| 1 | Economic outcomes | 10% | 9% | −1 |
| 2 | Foreign policy & war | 12% | 11% | −1 |
| 3 | Civil rights & equality | 10% | 9% | −1 |
| 4 | Civil liberties & rule of law | 8% | 8% | 0 |
| 5 | Domestic welfare & health | 10% | 9% | −1 |
| 6 | Environmental stewardship | 6% | 6% | 0 |
| 7 | Crisis management | 10% | 9% | −1 |
| 8 | Institutional integrity | 8% | 7% | −1 |
| 9 | Democratic health | 8% | 8% | 0 |
| 10 | Long-tail consequences | 8% | 7% | −1 |
| 11 | Decorum & conduct | 4% | 4% | 0 |
| 12 | Effect on populace | 6% | 6% | 0 |
| **13** | **Immigration & demographics** | **—** | **7%** | **+7** |
| | **Total** | **100%** | **100%** | |

**Provisional flag still applies.** v1.1's annotation marking §6 weights as preliminary pending Workstream C remains in force. Cat 13's 7% in particular is an editorial judgment without a direct published-methodology mapping (no major presidential ranking weights immigration as its own category); Workstream C should test whether the published rankings have implicit immigration weighting that maps to 7% or a different value.

---

## §7 Cultural Lens Presets — MODIFIED (13 categories, 8 lenses)

**Structural changes:**

1. Renormalized v1.1's 6 lens vectors to 13 categories.
2. Added Populist lens.
3. Added Internationalist lens.
4. Declined Christian Nationalist lens (rationale documented below).
5. Tightened lens descriptions, especially Libertarian's institutional-integrity weighting.

### Full v1.2 lens table

All weights are percentages summing to 100% per lens. **Provisional pending Workstream C** for all 8 lens vectors *and* the default — Workstream C will validate against published intellectual-tradition methodologies and recommend adjustments.

| Category | Default | Progressive | Classical Liberal | Conservative | Libertarian | Communitarian | Realist | **Populist** | **Internationalist** |
|----------|--------:|------------:|------------------:|-------------:|------------:|--------------:|--------:|-------------:|---------------------:|
| 1. Economic | 9% | 9% | 11% | 13% | 13% | 7% | 9% | **13%** | **6%** |
| 2. Foreign policy & war | 11% | 9% | 9% | 13% | 7% | 7% | 21% | **7%** | **15%** |
| 3. Civil rights & equality | 9% | 14% | 9% | 5% | 7% | 7% | 6% | **6%** | **8%** |
| 4. Civil liberties & rule of law | 8% | 7% | 15% | 7% | 19% | 5% | 6% | **6%** | **8%** |
| 5. Domestic welfare & health | 9% | 14% | 5% | 5% | 3% | 11% | 6% | **13%** | **6%** |
| 6. Environment | 6% | 11% | 4% | 4% | 4% | 7% | 4% | **3%** | **11%** |
| 7. Crisis management | 9% | 7% | 7% | 11% | 7% | 7% | 15% | **9%** | **8%** |
| 8. Institutional integrity | 7% | 5% | 11% | 9% | 13% | 9% | 7% | **4%** | **8%** |
| 9. Democratic health | 8% | 7% | 11% | 5% | 11% | 7% | 6% | **6%** | **8%** |
| 10. Long-tail consequences | 7% | 3% | 5% | 7% | 3% | 7% | 13% | **6%** | **4%** |
| 11. Decorum & conduct | 4% | 1% | 2% | 7% | 1% | 7% | 1% | **2%** | **2%** |
| 12. Effect on populace | 6% | 1% | 2% | 3% | 2% | 7% | 1% | **11%** | **8%** |
| **13. Immigration & demographics** | **7%** | **12%** | **9%** | **11%** | **10%** | **12%** | **5%** | **14%** | **8%** |
| **Total** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** |

**Renormalization methodology applied:**

- For the six v1.1 lenses, each weight was reduced proportionally to make room for Cat 13, with the Immigration weight set per lens-tradition.
- 1% floor from v1.1 §7 preserved across all cells (no zero weights remain).
- Lens characters preserved: Conservative still leads Foreign Policy and Economic; Libertarian still dominates Civil Liberties; Realist still concentrates Foreign Policy + Crisis + Long-tail; Communitarian remains evenly distributed.

### Lens descriptions (v1.2 — tightened)

**Progressive** — Civil rights, welfare, environment, and immigration lead. Decorum and populace mood given little weight; structural outcomes matter more than tone. Treats immigration as a civil-rights-adjacent issue.

**Classical Liberal** — Civil liberties, rule of law, institutional integrity, and democratic health lead. Skeptical of executive expansion across the board. Tradition: Locke, Mill, modern American constitutionalism. Moderate weight on immigration as a rule-of-law and economic question.

**Conservative** — Foreign policy strength, economic growth, decorum, and institutional integrity lead. Tradition and order weighted higher than rights expansion. Tradition: Burke, Kirk, Buckley. Immigration enforcement is a core concern, weighted accordingly.

**Libertarian** — Civil liberties dominant. Foreign-policy restraint, fiscal discipline, and institutional integrity highly weighted. Welfare and environment weighted least. The 13% on Institutional Integrity reflects the Hayekian wing of the tradition — rule of law and predictable institutions as the foundation of liberty — not the Rothbardian anti-state wing. Moderate-to-high on immigration, reflecting both pro-freer-movement and rule-of-law tensions in the tradition.

**Communitarian** — Welfare, social cohesion, institutional integrity, and decorum lead. Emphasizes felt experience of citizens and shared norms. Tradition: Etzioni, MacIntyre, Sandel. Higher weight on immigration than Conservative — communitarian concerns include both integration and treatment.

**Realist** — Foreign policy, crisis management, and long-tail consequences dominate. Substantially discounts decorum, populace mood, and rights-talk in favor of outcomes and great-power positioning. Tradition: Morgenthau, Kennan, Mearsheimer. Low weight on immigration as a great-power-politics matter.

**Populist (NEW in v1.2)** — Anti-elite framing; emphasizes economic and welfare delivery to working/middle-class citizens; immigration enforcement weighted very high; institutional integrity and decorum weighted very low. Tradition: variously associated with Jackson, Bryan, Long, Wallace, contemporary right- and left-populist figures. Captures the value framework that has shaped substantial recent political behavior and is currently uncovered by the other lenses.

**Internationalist (NEW in v1.2)** — Liberal internationalism / multilateralism. Heavy weight on foreign policy, environment (climate via multilateral order), international standing (Cat 12), and democratic health. Lower weight on long-tail (preferring near-term coalition-building over generational outcomes). Tradition: Wilson, FDR-on-foreign-policy, Acheson, the post-1945 institution-builders, Brookings/CFR mainstream. Counterweight to Realist.

### Christian Nationalist lens — DECLINED (rationale documented)

This lens was considered and explicitly declined. Two reasons:

1. **Normative content concern.** Christian Nationalism, as defined in contemporary scholarly literature, includes positions that are hostile to the civil rights of non-Christian Americans and to constitutional disestablishment. Shipping it as a "preset" in the same UI surface as Progressive or Conservative implicitly frames it as one legitimate value framework among others. The framework's intent is to surface value-pluralism across positions that can be defended within a constitutional-democratic frame; Christian Nationalism's defining commitments include positions that fall outside that frame.
2. **Substitutability via custom weights.** Much of what differentiates Christian Nationalism from Conservative — higher weight on Decorum, tradition, and "American Christian civilization" framing — can be approximated by users dialing their personal weights under Layer 3 of the spec's weighting architecture (§5.3). Users who want this preset can construct it themselves; the framework doesn't ship it.

This declination is documented in the public-facing FAQ so users can see it was considered and rejected. The exact FAQ language is a Phase 2 PRD task; reserve the position in v1.2 spec language.

---

## §10 Data Model — MODIFIED (Cat 13 + sub-criterion additions)

The v1.1 data model sketch is preserved structurally; only the seeded values change. Three additions:

- `categories` table gets 1 new row (Cat 13).
- `sub_criteria` table gets 8 new rows (3.5; 8.5, 8.6, 8.7; 13.1, 13.2, 13.3, 13.4). Note: 8.4 stays; it's been redefined (quality only) rather than removed.
- `lens_presets` table gets 2 new rows (Populist, Internationalist).
- `lens_weights` table gets 13 new rows × 2 lenses = 26 new rows, plus 13 rows for the v1.1 lenses for Cat 13.

No schema changes — just additional seed values.

---

## §11 Open Questions — STATUS UPDATE

All v1.1 open questions remain in the state v1.1 left them. v1.2 surfaces three new ones:

**OQ #9 (new in v1.2) — Sub-criterion-level weighting within categories.** v1.2 still treats sub-criteria within a category as equal-weighted when computing `category_net = mean(sub-criteria nets)`. This means in Cat 2, war-and-peace (2.1) is weighted identically to diplomacy (2.3) — even though their stakes can differ by orders of magnitude. Open question: do we add per-sub-criterion weights, or document equal-weighting as a deliberate simplification? *Defer to v1.3 or Workstream C output.*

**OQ #10 (new in v1.2) — Cat 13 weight validation.** No published presidential-ranking methodology explicitly weights immigration as a top-level category. Workstream C should test whether the 7% default is defensible against published methodologies' implicit treatment of immigration, and recommend a value. *Workstream C dependency.*

**OQ #11 (new in v1.2) — Populist and Internationalist lens validation.** The two new lenses are editorial judgments based on stated intellectual traditions. Workstream C should validate the weight vectors against the specific traditions cited (Jackson/Bryan/Long for Populist; Wilson/Acheson/Brookings-CFR for Internationalist). *Workstream C dependency.*

---

## Items deliberately NOT changed in v1.2

For traceability:

- **The 12-categorty-to-13 expansion did not change category weights for Cat 11 (Decorum) or Cat 12 (Populace).** These were already low (4% and 6%) and were preserved at v1.1 levels for the default vector. They were reduced in some lens vectors but only by small amounts.
- **Multi-term presidents** still scored as one entity (per v1.1 §11 OQ #6 resolution). FDR's four terms = one entry.
- **Sub-criterion-level weighting** still equal within categories. v1.2 doesn't change this; flagged in OQ #9.
- **The dual-axis-vs-net-collapse UX tension** still applies; this is a Phase 2 design question.
- **LBJ worked example** (§8 of the v1.0 spec) — still has evidence for only 2 of 48 sub-criteria. Updating it to cover the now-56 sub-criteria is a separate task (would be folded into the anchor-scoring pass if LBJ were an anchor; he's not, so this just rolls into Workstream B for LBJ).
- **Cat 10 as parallel category vs. temporal lens.** Held for v1.3+. v1.2 preserves v1.0's parallel-category structure.

---

## Effect on the Phase 1 plan after v1.2

Updated sequence:

```
✓ spec-hardening (v1.1 redline — done)
✓ Workstream A (framework critique — done)
✓ v1.2 spec redline (this document — done)

→ Phase 1.5: per-era benchmark appendix for Cats 2, 3, 4, 6, 9, 11 (~1 day)
→ draft anchor scores for 5 anchors (FDR, Truman, Eisenhower, Nixon, Reagan)
→ Marshall Cahill anchor review (halt)
→ Workstream B (remaining 11 presidents; Lean MVP: 1 evidence item per sub-criterion first pass against 56 sub-criteria)
    + Workstream C (weight validation: default + 8 lens vectors; addresses OQs 10, 11) in parallel
→ Workstream B URL-verification pass
→ Workstream D synthesis + bias audit + external-validity check
→ Phase 1 packet to Marshall Cahill
→ wait for `phase-2-go`
```

**Updated scope estimates:**

- Sub-criterion judgments: 56 × 16 = 896 (was 768 in v1.1). +17%.
- Anchor pass: 5 presidents instead of 3. +67% for the anchor stage; total scoring work shifts but doesn't change much overall.
- Weight vectors: 9 (default + 8 lenses) instead of 7. Workstream C scope +29%.
- Phase 1.5 added: ~1 day for the era-benchmark appendix.

These are tracked but not blocking — the v1.2 spec is ready for Phase 1.5 to begin.

---

*End of v1.2 redline. Next deliverable: era-benchmark appendix (`era-benchmarks-v1.md`) or jump straight to anchor scoring per Marshall Cahill's preference.*
