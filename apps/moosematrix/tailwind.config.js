const shared = require("../../packages/ui/tailwind.config.js");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...shared,
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ]
};
