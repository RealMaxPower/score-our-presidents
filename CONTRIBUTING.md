# Contributing

Thanks for thinking about contributing. This project has **two distinct contribution paths** because the repo bundles three differently-licensed bodies of work (see the [License section in `README.md`](README.md#license)):

1. **Code** — the site, libraries, tests, scripts. MIT-licensed. Normal open-source contribution flow.
2. **Methodology & scores** — the rubric, lens definitions, calibration anchors, and per-president evidence. CC BY-SA / CC BY. **Editorial process, not PR-driven.**

Pick the right path for what you want to do — this matters.

---

## Path 1 — Code contributions (MIT)

Bug fixes, performance work, accessibility improvements, new UI affordances, tests, infrastructure, documentation for code: all welcome via normal PR.

### Before you start

- Open an issue first for anything non-trivial. A 10-line bug fix doesn't need one; a new page or library does.
- Read [`SETUP.md`](SETUP.md) for the local dev environment and [`DEPLOYMENT.md`](DEPLOYMENT.md) for the production stack.
- Architecture context lives in `architecture-v1.md`.

### PR checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] New code has tests where it makes sense (we use Vitest)
- [ ] No new dependencies unless discussed in an issue first
- [ ] Commit messages are descriptive (we use conventional-ish messages but don't enforce it)

### Licensing of code contributions

By submitting code, you agree your contribution is licensed under MIT (the file's license). No CLA.

---

## Path 2 — Methodology, scoring, or evidence concerns

**This is the path that probably brought you here.** If you disagree with how a president scored, found a sourcing error, want to challenge a calibration anchor, or believe an evidence item is factually wrong, please **do not open a PR.** Score and methodology changes don't go through PRs — they go through a documented editorial process.

### If you are a scored subject (or an authorized representative)

Use the **right-of-reply** process described in [`DISCLAIMER.md`](DISCLAIMER.md). Email **editorial@scoreourpresidents.org** with:

- The president file (e.g., `scores/joe_biden.yaml`)
- The sub-criterion ID (e.g., `7.3`)
- The specific evidence item and what is factually inaccurate
- A corrective source (URL or document)

We acknowledge within seven days and publish a determination within thirty days.

### If you are a reader, journalist, or researcher

Open a **Score correction request** issue from the issue template. We treat sourcing improvements, citation fixes, missing primary documents, and factual errors as the kind of contribution we genuinely need. Please include:

- The president file and sub-criterion ID
- What you believe is inaccurate or under-sourced
- A specific corrective source (primary or tier-1 secondary)

If you propose a *methodology* change (weight vectors, category structure, lens definitions, era benchmarks), open a **Methodology discussion** issue. Methodology changes go through Workstream-style revision, not patch-level edits.

---

## Code of conduct

The subject matter here is politically charged. Disagreement is welcome; personal attacks, bad-faith argumentation, harassment, and slurs are not. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Editorial-address communications get the same standard.

## Security issues

Please don't open public issues for security vulnerabilities — follow [`SECURITY.md`](SECURITY.md).

## Questions

Editorial questions → `editorial@scoreourpresidents.org`. Code questions → open an issue.
