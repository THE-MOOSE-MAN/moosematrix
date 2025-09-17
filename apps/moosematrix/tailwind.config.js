const shared = require("../../packages/ui/tailwind.config.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...shared,
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body / paragraphs
        sans: ["var(--font-inter)", "sans-serif"],
        // Headings + code
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
};

