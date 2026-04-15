import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        syne: ["'Syne'", "sans-serif"],
        sans: ["'Instrument Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
