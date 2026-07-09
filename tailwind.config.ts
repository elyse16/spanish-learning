import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bright & playful palette
        tang: { DEFAULT: "#FF6B35", dark: "#EA580C" }, // sunset orange (primary)
        teal: { DEFAULT: "#0EA5A4", dark: "#0F766E" }, // teal
        sunny: { DEFAULT: "#FFC94B", dark: "#F59E0B" }, // sunny yellow
        grape: { DEFAULT: "#7C5CFC", dark: "#6D28D9" }, // purple pop
        ink: "#1E2233", // near-black text
      },
      fontFamily: {
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pop: "0 6px 0 0 rgba(30,34,51,0.12)",
        "pop-sm": "0 4px 0 0 rgba(30,34,51,0.12)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        wiggle: "wiggle 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
