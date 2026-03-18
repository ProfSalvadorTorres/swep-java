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
        // Dark tech palette
        dark: {
          bg:      "#0f172a",
          card:    "#1e293b",
          border:  "#334155",
          muted:   "#475569",
        },
        brand: {
          green:   "#22c55e",
          greenDim:"#16a34a",
          blue:    "#3b82f6",
          red:     "#ef4444",
          yellow:  "#eab308",
        },
        text: {
          primary:  "#e2e8f0",
          secondary:"#94a3b8",
          code:     "#7dd3fc",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
