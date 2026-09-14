import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F1F3EF",
        ink: "#1F2933",
        accent: "#2C4C74",
        growth: "#3F7A5C",
        warn: "#9C6A26",
      },
      fontFamily: {
        heading: ["'Gowun Batang'", "serif"],
        body: ["'Noto Sans KR'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
