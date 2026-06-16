# Score Our Presidents — Brand Guidelines

## 1. Name & Tagline

- **Name:** Score Our Presidents
- **Sub-headline:** The Presidential Scoring Framework
- **Short form:** Score Our Presidents
- **Avoid:** "SOP"/"PSF" or other initialisms — three-letter acronyms read more like a political action committee than a scholarly project.
- **Working tagline:** *16 presidents. 56 criteria. One ledger.*
- **Voice positioning:** scholarly · non-partisan · data-journalism register

## 2. The Mark — Anatomy

A ledger tally: four vertical strokes plus a diagonal fifth slash. The universal score-keeping glyph — semantically perfect for a scoring/ledger publication.

**Geometry**

| Property | Value |
|---|---|
| ViewBox | `0 0 40 32` |
| Vertical stroke positions | x = 6, 13, 20, 27 (7-unit pitch) |
| Vertical stroke y-range | y = 4 → 28 |
| Vertical stroke width | 3 |
| Vertical color | `#1a1a2e` (charcoal-900) |
| Diagonal endpoints | (3, 29) → (33, 3) |
| Diagonal stroke width | 3.25 |
| Diagonal color | `#b45309` (rust-700) |
| Stroke caps | square (editorial / typographic feel) |
| Minimum size | 16 × 16 |
| Clear space | ≥ 1 stroke pitch (7 viewBox units) on all sides |

**Two-color expression.** The charcoal verticals are the count; the rust diagonal is the editorial pen-stroke that completes the five. The slash is the focal accent, mirroring the existing `.drop-cap` and `.rust-rule` treatments in [app/globals.css](app/globals.css).

**Reverse-out.** Pass `monochrome` to the React component to render both groups in `currentColor` (e.g., for dark surfaces, single-color print).

## 3. Color Palette

All brand surfaces use the existing Tailwind tokens defined in [tailwind.config.ts](tailwind.config.ts). Do not introduce new brand colors.

| Token | Hex | Role |
|---|---|---|
| `cream-50` | `#fafaf5` | Page background, icon plate |
| `cream-100` | `#f9f7f1` | Footer background |
| `cream-200` | `#f1ede4` | Subtle card fill |
| `charcoal-900` | `#1a1a2e` | Body text, vertical tally strokes |
| `charcoal-700` | `#3a3a4e` | Secondary text, eyebrows |
| `rust-700` | `#b45309` | Accent, diagonal slash, links, rules |
| `rust-800` | `#9a3412` | Hover state for rust links |

**Reserved for data viz only — never use on brand surfaces:**
`good-*` and `harm-*` tokens. They carry semantic meaning in scorecards (positive / negative outcomes) and must not bleed into the brand expression.

## 4. Typography

- **Display, wordmark, headings:** Playfair Display — loaded via `next/font/google` in [app/layout.tsx](app/layout.tsx), exposed as `--font-display` and the `font-display` Tailwind utility. Weights 400 / 500 / 700 / 800.
- **Body & UI:** system sans stack (`ui-sans-serif, system-ui, sans-serif`).
- **Editorial eyebrow / label:** uppercase, 10–11px, letter-spacing `0.16em`–`0.18em`, color `charcoal-700`.
- **Drop-cap (hero intro):** Playfair Display, `rust-700`, ~4.5rem — see `.drop-cap` in [app/globals.css](app/globals.css).

The wordmark in the `Logo` component is rendered as HTML, not SVG `<text>`, so it inherits Playfair Display from the document and scales with Tailwind responsive utilities.

## 5. Logo Usage

Component: [components/logo.tsx](components/logo.tsx). Exports `Logo` (composed) and `TallyMark` (raw SVG).

**Variants**

| Variant | Use case | Mark size | Wordmark size |
|---|---|---|---|
| `lockup` (default) | Site header | h-5 / sm:h-6 | text-base / sm:text-xl |
| `footer` | Site footer | h-7 | text-lg |
| `mark` | Tight spots, social embeds, isolated mark | h-8 (override via `className`) | — |

**Do**

- Use `<Logo variant="lockup" />` in the header.
- Use `<Logo variant="footer" />` in the footer.
- Use `<Logo variant="mark" />` when only the symbol is needed.
- Preserve clear space (≥ 1 stroke pitch on all sides).
- Keep the mark on `cream-50`, `cream-100`, or `cream-200` backgrounds.

**Don't**

- Don't recolor the diagonal anything other than `rust-700` (use the `monochrome` prop on dark surfaces instead).
- Don't stretch the viewBox or alter stroke widths.
- Don't substitute the wordmark font.
- Don't place on photographic or imagery backgrounds without a cream plate.
- Don't use the tally mark below 16px.

## 6. Voice & Tone

- **Scholarly first**, never academic-jargon-dense.
- **Non-partisan.** The palette is deliberately rust + charcoal — no red/blue political associations.
- **Calibration over opinion.** Cite the anchors (FDR, Truman, Eisenhower, Nixon, Reagan) when establishing baselines.
- **Quantitative phrasing.** "+3 on civil liberties" over "great on civil liberties."

## 7. Asset Locations

| Asset | Path |
|---|---|
| React component | [components/logo.tsx](components/logo.tsx) |
| Favicon (SVG) | [app/icon.svg](app/icon.svg) |
| Apple touch icon (dynamic PNG) | [app/apple-icon.tsx](app/apple-icon.tsx) |
| Color tokens & type config | [tailwind.config.ts](tailwind.config.ts) |
| Editorial CSS accents | [app/globals.css](app/globals.css) |
