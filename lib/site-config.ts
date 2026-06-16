export const SITE_NAME = "Score Our Presidents";
export const SITE_SUBHEADLINE = "The Presidential Scoring Framework";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_SUBHEADLINE}`;
export const SITE_TAGLINE =
  "16 modern US presidents scored on 56 sub-criteria across 13 categories.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.scoreourpresidents.org";
export const TWITTER_HANDLE: string | undefined = undefined;

// Canonical, always-absolute base URL for transactional email. Email links and
// images are read by external recipients, so they must never resolve to a dev
// (`localhost`) or preview (`*.vercel.app`) origin — which `SITE_URL` can be,
// since it follows NEXT_PUBLIC_SITE_URL per environment. Hardcode the public
// production domain here instead.
export const EMAIL_BASE_URL = "https://www.scoreourpresidents.org";
// Logo served by the App Router from app/icon.png at /icon.png.
export const EMAIL_LOGO_URL = `${EMAIL_BASE_URL}/icon.png`;

export const OG_COLORS = {
  cream50: "#fafaf5",
  cream100: "#f9f7f1",
  charcoal700: "#3a3a4e",
  charcoal900: "#1a1a2e",
  rust700: "#b45309",
  rust800: "#9a3412",
  good700: "#1d4ed8",
  stone300: "#d6d3d1",
  stone500: "#78716c",
} as const;
