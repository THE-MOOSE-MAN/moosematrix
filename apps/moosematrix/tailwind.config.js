const path = require("path");
const shared = require("../../packages/ui/tailwind.config.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...shared,
  content: [
    ...(shared.content ?? []),
    path.join(__dirname, "./src/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "./app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "./components/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    ...(shared.theme ?? {}),
    extend: {
      ...(shared.theme?.extend ?? {}),
      fontFamily: {
        ...(shared.theme?.extend?.fontFamily ?? {}),
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
};
