import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090F",
        foreground: "#FFFFFF",
        muted: "rgba(255,255,255,0.4)",
        accent: {
          DEFAULT: "#22C55E",
          hover: "#4ADE80",
          dim: "#052e16",
          // Section accent colors from the brand palette (Neon Vibes concept) —
          // used to color-code rail headers/icons/match-reason text per section.
          pink: "#FF3DBB",
          amber: "#FFC857",
          purple: "#B43DFF",
        },
        card: "rgba(255,255,255,0.04)",
        "card-border": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        saveBounce: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.3)" },
          "70%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        toastPop: {
          "0%": { opacity: "0", transform: "translate(-50%, 4px) scale(0.9)" },
          "15%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
        },
        driftFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-18px) scale(1.05)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.5)" },
          "70%": { boxShadow: "0 0 0 22px rgba(34,197,94,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },
        },
        cardPop: {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        scan: "scan 1.6s ease-in-out infinite",
        saveBounce: "saveBounce 0.42s ease-out",
        toastPop: "toastPop 0.25s ease-out forwards",
        driftFloat: "driftFloat 6s ease-in-out infinite",
        pulseRing: "pulseRing 1.6s ease-out infinite",
        cardPop: "cardPop 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
