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
        accent: "#FF6B35",
        card: "rgba(255,255,255,0.04)",
        "card-border": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-outfit)", "sans-serif"],
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
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        scan: "scan 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
