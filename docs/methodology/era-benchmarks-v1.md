# Era-Anchored Benchmarks — v1.0

**Base spec:** v1.2 (`spec-v1.2-redlined.md`)
**Deliverable:** Phase 1.5
**Date:** 2026-05-11
**Status:** Operational rubric for anchor scoring and full Workstream B scoring

---

## Purpose and how to use this document

The framework's dual-axis scoring (good 0–10, harm 0–10 per sub-criterion) requires a stable answer to "what does 10 mean?" That answer is era-dependent for six categories. The same action can be transformational in one era and routine in another — the Marshall Plan in 1947 is era-defining foreign policy; the same monetary outlay in 2024 would be unremarkable.

This appendix defines what `10 good`, `5 good`, `10 harm`, and `5 harm` look like in each major era for the six most era-sensitive categories. Scorers use these benchmarks as follows:

1. Identify the era the action occurred in (not the era of scoring).
2. For each affected sub-criterion in the relevant category, locate the era benchmark below.
3. Score against the era's anchor: "this action's good is comparable to a 7 anchor in this era".
4. Document era choice in the sub-criterion's `era_context` field per v1.1 §9.4.

**Era boundaries are category-specific** because what era-defines foreign policy doesn't era-define decorum. Boundaries are deliberately approximate — when an action straddles an era boundary (e.g., a policy enacted in 1991 with effects in the unipolar era), score against the era the *decision* was made in unless the policy was clearly forward-looking.

`0 good` and `0 harm` represent "no impact in this dimension" and are not era-specific. `10` is the era-anchored ceiling.

Six categories covered: **Cat 2 (Foreign Policy & War), Cat 3 (Civil Rights), Cat 4 (Civil Liberties), Cat 6 (Environment), Cat 9 (Democratic Health), Cat 11 (Decorum).**

---

## Cat 2 — Foreign Policy & War

### Era boundaries (Cat 2)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E2.1 Interwar** | 1933–1941 | Avoiding entanglement; managing rising fascist threat; isolationist baseline |
| **E2.2 World War II** | 1941–1945 | Prosecuting total war; building Allied coalition; planning postwar order |
| **E2.3 Cold War** | 1945–1991 | Bipolar containment; nuclear deterrence; alliance leadership; proxy conflicts |
| **E2.4 Unipolar moment** | 1991–2014 | American primacy; use-of-force decisions in a permissive environment; post-9/11 GWOT |
| **E2.5 Multipolar contested** | 2014–present | China rise + Russia revisionism; eroded primacy; alliance maintenance under strain |

### Benchmarks (Cat 2)

| Era | 10 good (transformational positive) | 5 good (solid positive) | 10 harm (catastrophic negative) | 5 harm (clear negative) |
|-----|--------------------------------------|--------------------------|----------------------------------|--------------------------|
| E2.1 Interwar | Building anti-fascist coalition while preparing US capacity (FDR 1939–1941 Lend-Lease, Atlantic Charter framing) | Maintaining stable relations and modest military readiness | Appeasement enabling fascist consolidation OR provoking war without preparation | Drift; failure to recognize emerging threats |
| E2.2 WWII | Decisive prosecution + postwar planning (FDR/Truman: D-Day, UN, Bretton Woods, Marshall Plan groundwork) | Competent prosecution with mixed allied management | Strategic catastrophe (lost theater, fractured alliance) | Significant operational failures; allied friction |
| E2.3 Cold War | Containment success without nuclear escalation + alliance-building (Truman/Marshall Plan, Eisenhower restraint, Reagan late-CW maneuvering) | Status-quo competition managed; modest alliance work | Vietnam-scale proxy-war catastrophe OR near-miss nuclear escalation | Bay of Pigs-class failure; serious alliance damage |
| E2.4 Unipolar | Restrained use of primacy with multilateral legitimacy (GHW Bush Gulf War coalition; Clinton Bosnia-Kosovo with NATO) | Modest competence; periodic interventions handled professionally | Unilateral war of choice with poor outcomes (Iraq 2003); 9/11-class intelligence/security failure | Significant policy failure with regional spillover (Libya post-Gaddafi); strained alliances |
| E2.5 Multipolar | Effective coalition-building against revisionist powers without conflict; alliance modernization | Steady management of strategic competition | Great-power war OR accelerating anti-US coalition; total alliance collapse | Major alliance fracture; significant retreat from commitments |

### Anchor examples (Cat 2)

- **E2.3 Cold War — 10 good anchor:** Truman's Marshall Plan + NATO formation + Berlin Airlift sequence — built the architecture that defined the next 40 years.
- **E2.3 Cold War — 10 harm anchor:** LBJ's Vietnam escalation through Westmoreland-era ground commitment (2.1, 2.4 both implicated).
- **E2.4 Unipolar — 10 harm anchor:** GW Bush's Iraq War decision and conduct (2.1, 2.4 both implicated).
- **E2.4 Unipolar — 7-8 good anchor:** GHW Bush's Gulf War + post-Cold War transition management.

### Notes for scorers

- Score the era the *decision* was made in, not the era the effects landed in.
- Use 2.1 (war/peace decisions) for the decision itself; 2.4 (civilian impact) for casualties; 2.2 (alliance management) for coalition effects; 2.3 (diplomacy & soft power) for non-kinetic dimensions.
- Casualty figures are stable evidence across eras; weight them at face value rather than discounting historical wars.

---

## Cat 3 — Civil Rights & Equality

### Era boundaries (Cat 3)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E3.1 Pre-Brown** | 1933–1954 | Jim Crow legal; segregation institutional; New Deal racial blind spots |
| **E3.2 Civil rights revolution** | 1954–1968 | Brown, CRA '64, VRA '65, Fair Housing '68 — federal framework built |
| **E3.3 Post-revolution consolidation** | 1968–2003 | Enforcement, expansion to gender, contested implementation |
| **E3.4 LGBTQ+ expansion / contested** | 2003–2022 | Lawrence, Obergefell, ADA expansion, post-9/11 racial tensions |
| **E3.5 Post-Dobbs contested** | 2022–present | Rights retraction in some dimensions; affirmative-action end; ongoing |

### Benchmarks (Cat 3)

| Era | 10 good | 5 good | 10 harm | 5 harm |
|-----|---------|--------|---------|--------|
| E3.1 Pre-Brown | Significant anti-discrimination action within era's narrow possibility space (Truman's EO 9981 desegregating armed forces) | Symbolic gestures; appointing minority officials within era norms | Active enforcement of legal segregation; eugenics programs; ethnic internment (FDR's EO 9066 — Japanese internment is era-10-harm) | Failure to act on documented atrocities (FDR's refusal of Jewish refugees) |
| E3.2 Civil rights revolution | Era-defining federal civil rights legislation (LBJ's Civil Rights Act, Voting Rights Act, Fair Housing Act) | Steady enforcement of new framework | Active obstruction of civil rights enforcement; alignment with segregationist forces | Half-hearted enforcement; rhetoric over action |
| E3.3 Post-revolution consolidation | Major expansion to new protected classes (ADA under GHW Bush; significant gender-equity legislation) | Steady enforcement; competent administration | Active rollback of established protections; rhetorical alignment with discrimination | Enforcement neglect; signaling against minorities |
| E3.4 LGBTQ+ expansion | Same-sex marriage policy leadership (Obama's "evolution"); significant LGBTQ+ rights expansion | Steady enforcement; modest expansion | Active anti-LGBTQ+ federal policy; rollback of established protections | Refusing to defend rights in court; symbolic exclusion |
| E3.5 Post-Dobbs | Significant restoration / new federal protections post-rollback | Defending existing federal protections in litigation; status-quo enforcement | Active federal rollback of LGBTQ+, voting, or reproductive rights | Selective non-enforcement; sympathy with rollback agenda |

### Anchor examples (Cat 3)

- **E3.1 — 10 harm anchor:** FDR's Japanese internment (3.1) — era-defining civil rights catastrophe even by era standards (criticized contemporaneously, not just retroactively).
- **E3.2 — 10 good anchor:** LBJ's Civil Rights Act + Voting Rights Act + Fair Housing Act sequence — the modern federal civil rights framework.
- **E3.4 — 7-8 good anchor:** Obama's "evolution" on same-sex marriage + DOJ withdrawal of DOMA defense.

### Notes for scorers (Cat 3)

- 3.5 (Tribal & indigenous policy) is new in v1.2 — score termination-era policy under E3.1, ICWA-era under E3.2/3.3, modern under E3.4/3.5.
- Era-typical norms matter: FDR's racial blind spots are partially era-explained, but Japanese internment was *also* criticized at the time (e.g., Korematsu dissents) — score at era-10-harm rather than excusing as era-typical.
- Civil rights actions taken in later eras against earlier-era patterns (e.g., LBJ's southern-strategy resistance) should be scored against the era of enactment, not retroactively normalized.

---

## Cat 4 — Civil Liberties & Rule of Law

### Era boundaries (Cat 4)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E4.1 Pre-Cold War** | 1933–1947 | Sedition Act revival, mass internment, FBI ascendance — civil-liberties pre-Cold-War-era baseline |
| **E4.2 Cold War surveillance** | 1947–1989 | COINTELPRO, McCarthy, FBI surveillance of activists, executive privilege expansion |
| **E4.3 Post-Cold War interregnum** | 1989–2001 | Relative restraint; technology emerging but not yet enabling surveillance state |
| **E4.4 War on Terror** | 2001–2013 | Patriot Act, mass surveillance, executive expansion, indefinite detention, drone program |
| **E4.5 Post-Snowden** | 2013–present | Public awareness of surveillance; ongoing tension; partial reform attempts |

### Benchmarks (Cat 4)

| Era | 10 good | 5 good | 10 harm | 5 harm |
|-----|---------|--------|---------|--------|
| E4.1 Pre-Cold War | Significant defense of press/speech against rising authoritarianism elsewhere | Steady restraint on executive power | Mass detention without due process (FDR Japanese internment overlaps here on 4.x dimension); aggressive sedition prosecutions | Significant press intimidation; FOIA-analog secrecy |
| E4.2 Cold War surveillance | Active rollback of surveillance overreach (Carter-era FISA, Church Committee response) | Refusing to expand surveillance further | COINTELPRO-class domestic political surveillance; Watergate-class abuse of intelligence agencies | Looking-the-other-way on Hoover-era practices; secret war prosecution |
| E4.3 Post-Cold War | Significant strengthening of FOIA, press protections, executive restraint | Steady; restraint on emerging tech surveillance | Major rollback of established protections (rare in this era) | Selective FOIA enforcement; minor expansion of surveillance |
| E4.4 War on Terror | Active reform of post-9/11 surveillance (some Obama-era reform attempts) | Restraint within Patriot Act framework; not expanding | Mass surveillance program creation/expansion (Bush 43, partially Obama); torture program; indefinite detention | Continuation without reform; signing statement abuse |
| E4.5 Post-Snowden | Significant FISA reform; presidential pardons for prior abuses; FOIA expansion | Steady; not expanding surveillance | Major surveillance expansion; weaponization of intelligence against political opponents | Continued status quo despite known abuses |

### Anchor examples (Cat 4)

- **E4.2 — 10 harm anchor:** Nixon's use of FBI/CIA/IRS against political enemies (4.2, 4.3 both implicated).
- **E4.4 — 10 harm anchor:** GW Bush's torture program + warrantless wiretapping (4.2, 4.3, 4.4 implicated).
- **E4.4 — 5-6 good anchor:** Obama's banning of torture (good) without prosecuting prior abuses (limits the good).

### Notes for scorers (Cat 4)

- Pre-9/11 vs. post-9/11 is the largest single inflection — scoring Obama's surveillance posture against pre-9/11 norms is incorrect; score against E4.4 baseline.
- 4.3 (executive restraint) has been declining as a baseline across all eras; the era benchmark accounts for this — what counts as 5 good in E4.4 would be 2 good in E4.3.

---

## Cat 6 — Environmental Stewardship

### Era boundaries (Cat 6)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E6.1 Pre-environmental** | 1933–1962 | Conservation framing only; no air/water/climate awareness |
| **E6.2 Modern environmental** | 1962–1988 | Silent Spring → EPA → Clean Air/Water → Endangered Species Act; pollution as the frame |
| **E6.3 Climate-aware** | 1988–2015 | Hansen testimony onward; climate visible but not primary |
| **E6.4 Climate-imperative** | 2015–present | Paris Agreement; IPCC; climate as defining issue |

### Benchmarks (Cat 6)

| Era | 10 good | 5 good | 10 harm | 5 harm |
|-----|---------|--------|---------|--------|
| E6.1 Pre-environmental | Significant conservation legacy (FDR's CCC, national park expansion, soil conservation) | Modest conservation; status-quo posture | Active large-scale environmental destruction (active dust-bowl-era policy failures) | Drift; ignoring conservation needs of the era |
| E6.2 Modern environmental | Era-defining federal environmental legislation (Nixon-era EPA, Clean Air Act, Endangered Species Act) | Steady enforcement of new framework; modest expansion | Active rollback of pollution regulation; major environmental disasters mishandled | Enforcement neglect; deregulation without alternatives |
| E6.3 Climate-aware | Significant climate-policy leadership (Clinton's Kyoto signing; Obama's Clean Power Plan and Paris) | Steady environmental enforcement; modest climate engagement | Withdrawal from major climate frameworks; active fossil-fuel expansion in defiance of scientific consensus (GW Bush's withdrawal from Kyoto) | Climate inaction; rhetoric without policy |
| E6.4 Climate-imperative | Major decarbonization legislation (Biden's IRA + Inflation Reduction Act climate provisions); leading multilateral climate action | Steady enforcement; defending Paris commitments | Withdrawal from Paris; active rollback of EPA authority; promotion of fossil-fuel expansion at scale (Trump T1 and partial T2) | Selective rollback; appointing climate-skeptic regulators |

### Anchor examples (Cat 6)

- **E6.1 — 8-9 good anchor:** FDR's CCC + soil conservation + national park expansion — era-defining stewardship within E6.1's narrow conceptual frame.
- **E6.2 — 9-10 good anchor:** Nixon's EPA creation + Clean Air Act + Clean Water Act — paradoxically the largest single-administration environmental contribution despite Nixon's overall ranking.
- **E6.3 — 8-9 good anchor:** Obama's Paris Agreement leadership + Clean Power Plan + auto fuel-economy standards.
- **E6.4 — 9-10 good anchor:** Biden's IRA climate provisions (largest US climate spending in history).
- **E6.3/E6.4 — 8-9 harm anchor:** Trump T1's Paris withdrawal + EPA rollbacks.

### Notes for scorers (Cat 6)

- 6.1 (climate posture) is the most era-dependent sub-criterion in the framework. Pre-1988 scoring scores the broader environmental posture against era awareness; scoring FDR on climate-as-such is anachronistic and not done.
- "What you knew when you decided" matters: Reagan's environmental rollbacks were E6.2 baseline; Bush 43's Kyoto withdrawal was E6.3 (consensus existed); Trump T1's Paris withdrawal was E6.4 (consensus stronger).

---

## Cat 9 — Democratic Health

### Era boundaries (Cat 9)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E9.1 New Deal coalition** | 1933–1968 | Strong parties; peaceful transitions normal; some procedural contestation |
| **E9.2 Post-Watergate / partisan realignment** | 1968–2000 | Realignment dynamics; Watergate-era institutional stress; rising polarization |
| **E9.3 Bush v. Gore aftermath** | 2000–2016 | Election questioning normalizing; Tea Party / Occupy polarization; partisan media consolidation |
| **E9.4 Norm-erosion era** | 2016–present | Election-result denial; January 6; democratic backsliding visible to scholars |

### Benchmarks (Cat 9)

| Era | 10 good | 5 good | 10 harm | 5 harm |
|-----|---------|--------|---------|--------|
| E9.1 New Deal era | Significant strengthening of voting franchise (VRA-precursor steps); peaceful transitions through stress | Status-quo democratic functioning | Active suppression of voting (Southern Democratic apparatus); major political-violence escalation | Quiet acquiescence to ongoing suppression |
| E9.2 Post-Watergate | Significant democratic repair (post-Watergate reforms; campaign finance limits) | Steady; minor reform | Active institutional damage (Watergate itself; Iran-Contra cover-up scale) | Norm erosion; partisan use of agencies |
| E9.3 Bush v. Gore | Significant election-administration reform; reducing polarization | Steady administration; defending norms verbally | Active partisan use of DOJ/IRS for political ends; election-denying rhetoric | Tolerating partisan media's anti-democratic drift |
| E9.4 Norm-erosion | Active defense of democratic norms; prosecution of political violence; election-administration protection | Status quo; verbal defense | Election-result denial; January 6-class incitement of political violence; mass pardons of violence perpetrators | Tolerating political violence; partisan election interference |

### Anchor examples (Cat 9)

- **E9.2 — 10 harm anchor:** Nixon's Watergate (9.1 voting access via CREEP dirty tricks; 9.2 press; 9.4 polarization via Southern Strategy compound). Note: per §4.6 v1.2, score Watergate's most direct attribution at 8.3 norm adherence; reference effects on 9.x without separate scoring.
- **E9.4 — 10 harm anchor:** Trump T1's election-denial sequence + January 6 (9.3 political violence; 9.1 voting access via election-rejection efforts; 9.4 polarization). Per §4.6, score most directly at 8.3 and 9.3.

### Notes for scorers (Cat 9)

- E9.1 baseline understates ongoing voter suppression in the South — score against era expectations for federal action, not against modern voting-rights baseline.
- Watergate's most direct attribution per §4.6 is 8.3 (norm adherence) not 9.x — the 9.x effects are noted in category notes, not double-scored.
- January 6's most direct attribution per §4.6 is 8.3 and 9.3 (the two-attribution cap).

---

## Cat 11 — Decorum & Conduct of Office

### Era boundaries (Cat 11)

| Era | Span | Defining frame |
|-----|------|----------------|
| **E11.1 Mid-century formal** | 1933–1972 | Pre-Watergate baseline; formal presidential dignity expected; press protections for personal life |
| **E11.2 Post-Watergate informal** | 1972–1992 | Declining formality; Carter populism; Reagan media-savvy informality |
| **E11.3 Clinton-era erosion** | 1992–2008 | Sex scandals in mainstream; talk-radio escalation; partisan media-personality politics |
| **E11.4 Pre-Trump residual** | 2008–2016 | Obama-era formality re-asserted within partisan limits |
| **E11.5 Post-Trump baseline** | 2017–present | Substantially different baseline — formerly disqualifying behavior normalized |

### Benchmarks (Cat 11)

| Era | 10 good | 5 good | 10 harm | 5 harm |
|-----|---------|--------|---------|--------|
| E11.1 Mid-century | Exemplary formal conduct + use of office for unifying communication (FDR Fireside Chats with appropriate gravitas; Eisenhower's military-statesman manner) | Steady formality; competent ceremonial duty | Personal-scandal disgrace at era-defining level; rhetoric explicitly degrading opponents below era norm | Personal lapses publicly known; ceremonial neglect |
| E11.2 Post-Watergate | Restoring dignity after Watergate (Ford's pardon framing; Carter's earnestness; Reagan's eloquence) | Steady; competent communication | Watergate-class conduct disgracing office | Public squabbles; visible cabinet conflicts |
| E11.3 Clinton-era | Notable dignified communication amid eroded baseline | Steady within eroding norms | Sex-scandal-class personal misconduct (Clinton's perjury was era-defining harm in 11.1 dimension) | Public profanity; visible disrespect of office |
| E11.4 Pre-Trump | Exemplary formal conduct re-asserting dignity (Obama's manner) | Steady formality | Major personal-conduct breach (rare in era) | Public lapses; tone problems |
| E11.5 Post-Trump | Substantial restoration of pre-Trump norms (Biden attempt; mixed success) | Steady formality within new baseline | Sustained pattern of public profanity, name-calling, undignified rhetoric, attacks on opponents/press/foreign leaders below any prior era's norm | Episodic lapses within Trump-era baseline |

### Anchor examples (Cat 11)

- **E11.1 — 9 good anchor:** FDR's Fireside Chats — era-defining use of presidential communication.
- **E11.3 — 7-8 harm anchor:** Clinton's Lewinsky-era personal conduct (11.1, 11.4 implicated).
- **E11.5 — 9-10 harm anchor:** Trump T1's sustained pattern of public rhetoric (11.2, 11.4 implicated). Per §4.6, score most directly at 11.2; note 11.4 effect.

### Notes for scorers (Cat 11)

- Decorum is the most "lens-sensitive" category — Conservative and Communitarian lenses weight it substantially higher than Progressive or Libertarian. Era benchmarks apply identically across lenses; only the *weight* on the resulting score varies.
- Trump T1 and T2 establish E11.5 baseline; scoring Trump T1 at E11.4 ("former era") is incorrect — score within E11.5 against pre-Trump norms.
- Restoration of pre-Trump norms in E11.5 (Biden, partially) is era-relative high good despite being era-normal in E11.4.

---

## Cross-cutting notes

### Era handling for split-era administrations

Some administrations straddle era boundaries (e.g., Reagan starts in E2.3 Cold War and ends with E2.5 unipolar moment beginning). For these:

- Score the *predominant* era for sub-criteria where the action is era-distributed (overall foreign policy posture).
- Score the *enactment* era for specific actions (e.g., a 1980 Reagan action is E2.3; a 1988 action is transitional).
- Document the era choice in `era_context` field.

### Multi-attribution interactions with §4.6

When a single action triggers multi-category attribution under §4.6, each attributed sub-criterion is scored against its own category's era benchmarks. Watergate scored at 8.3 (norm adherence) uses Cat 8's era frame; the noted effect on 9.2 (press relationship) doesn't get separate scoring but if it did, it would use Cat 9 era frames.

### Era benchmarks vs. cross-president-rankings

Era benchmarks set the within-era ceiling. When the cross-president-rankings deliverable sorts all 16 presidents by a single sub-criterion, pre-era and post-era scores are directly comparable (a 10 in E2.3 and a 10 in E2.5 are both "transformational for their era") but the *underlying actions* differ greatly. Workstream D's external-validity check should note where the era-anchored sort matches published cross-era rankings and where it diverges.

### Updating benchmarks

These benchmarks are v1.0. Workstream B may surface cases where the era frame is wrong (e.g., an action that doesn't fit cleanly under any era benchmark). When that happens, flag in scoring notes and propose a benchmark adjustment for v1.1.

---

*End of era benchmarks v1.0. Next deliverable: draft anchor scores for FDR, Truman, Eisenhower, Nixon, Reagan against this benchmark.*
