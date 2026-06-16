# Editorial & Legal Disclaimer

**Read this alongside the [License section of `README.md`](README.md#license).**

## The scores are opinion, not fact

Every score, ranking, and category judgment in this project is an **editorial
opinion derived by applying a published rubric to documented, cited evidence.**
A score is *not* a statement of objective fact about any person. Two readers
applying different value-weightings (the project's "lenses") will get different
rankings from the same evidence — by design. Where this project says a
presidency scored high or low on a criterion, it means *the framework's
disclosed methodology, applied to the cited record, yields that judgment.*

This posture follows the opinion doctrine of *Milkovich v. Lorain Journal Co.*,
497 U.S. 1 (1990), and the disclosed-basis protection of *Partington v.
Bugliosi*, 56 F.3d 1147 (9th Cir. 1995): an evaluative opinion is protected
when the facts it rests on are disclosed and true. The methodology and the
underlying evidence are therefore published in full:

- **Methodology / rubric:** `docs/methodology/spec-v1.2-redlined.md`, `docs/methodology/era-benchmarks-v1.md`,
  `docs/methodology/weight-validation-v1.md`, `docs/methodology/cross-president-rankings.md`.
- **Per-president evidence, with sources:** the YAML files in [`scores/`](scores/).

## How evidence items are sourced

Each evidence item carries a `claim`, a `source_url`, a `source_type`, a
`tier`, and a `verification_status`:

- Factual claims about **living subjects** that bear on a harm score are cited
  to a **primary document** (court order, Federal Register entry, agency report,
  official record) or an **established tier-1 secondary source** wherever
  possible.
- Items that turn on contested or **actively litigated** matters are written as
  *attributed characterizations* — e.g., "plaintiffs allege … the administration
  disputes …" — rather than as adjudicated fact.
- Items marked `verification_status: pending` are evaluative/editorial
  characterizations (e.g., rhetorical tone, polarization, long-tail forecasts)
  that rest on the disclosed record rather than on a single citable fact. They
  are opinion and are labeled as such.
- Statistical estimates (death tolls, fiscal projections, polling) are
  attributed to the body that produced them and presented as estimates, not as
  the project's own factual findings.

## Living public figures

The subjects scored here are public figures. Their names and likenesses are used
**nominatively and for editorial commentary** — not commercially and not as an
endorsement. Nothing here implies that any subject endorses, is affiliated with,
or has reviewed this project.

## Corrections & right of reply

If you are a scored subject (or an authorized representative) and believe a
specific evidence item is factually inaccurate, write to
**editorial@scoreourpresidents.org** identifying the file, the sub-criterion
ID, the evidence item, what is inaccurate, and a corrective source. The project
commits, subject to good-faith effort, to **acknowledge a complete request
within seven days** and to **publish a determination — correction, removal, or
reasoned declination — within thirty days** (extendable once where additional
fact-finding is reasonably required, with notice). Determinations are recorded
in the public changelog.

## No warranty; not professional advice

This project is provided "as is," without warranty of any kind. It is a
research and editorial work, not legal, financial, electoral, or professional
advice. The maintainers are not liable for decisions made in reliance on it, to
the maximum extent permitted by law.

## Fair use of quoted material

Short quoted fragments of third-party material appear for editorial commentary
and are believed to be fair use under 17 U.S.C. § 107. Source links are
provided; rights in quoted material remain with their owners.
