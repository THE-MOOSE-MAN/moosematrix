/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "../../apps/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: { brand: { 600: "#4F46E5", 700: "#4338CA" } },
    },
  },
  plugins: [],
};

export default config;
