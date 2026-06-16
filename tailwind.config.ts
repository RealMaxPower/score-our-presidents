import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Per PRD §10: muted neutrals with good/harm accents (NOT red/blue).
        // CSS-variable-backed so the same token brightens on dark surfaces
        // (e.g. good-700 stays a dark blue on cream, becomes a lighter blue
        // on navy) without changing class names across the app.
        good: {
          50: "rgb(var(--color-good-50) / <alpha-value>)",
          500: "rgb(var(--color-good-500) / <alpha-value>)",
          700: "rgb(var(--color-good-700) / <alpha-value>)",
        },
        harm: {
          50: "rgb(var(--color-harm-50) / <alpha-value>)",
          500: "rgb(var(--color-harm-500) / <alpha-value>)",
          700: "rgb(var(--color-harm-700) / <alpha-value>)",
        },
        // The Ledger editorial palette — CSS variables so light/dark swap
        // semantically (bg-cream-50 = page background in either mode).
        cream: {
          50: "rgb(var(--color-cream-50) / <alpha-value>)",
          100: "rgb(var(--color-cream-100) / <alpha-value>)",
          200: "rgb(var(--color-cream-200) / <alpha-value>)",
        },
        charcoal: {
          700: "rgb(var(--color-charcoal-700) / <alpha-value>)",
          900: "rgb(var(--color-charcoal-900) / <alpha-value>)",
        },
        rust: {
          500: "rgb(var(--color-rust-500) / <alpha-value>)",
          600: "rgb(var(--color-rust-600) / <alpha-value>)",
          700: "rgb(var(--color-rust-700) / <alpha-value>)",
          800: "rgb(var(--color-rust-800) / <alpha-value>)",
        },
        stone: {
          100: "rgb(var(--color-stone-100) / <alpha-value>)",
          200: "rgb(var(--color-stone-200) / <alpha-value>)",
          300: "rgb(var(--color-stone-300) / <alpha-value>)",
          400: "rgb(var(--color-stone-400) / <alpha-value>)",
          500: "rgb(var(--color-stone-500) / <alpha-value>)",
          600: "rgb(var(--color-stone-600) / <alpha-value>)",
          700: "rgb(var(--color-stone-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        display: [
          "var(--font-display)",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
