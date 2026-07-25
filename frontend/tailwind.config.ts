import type { Config } from "tailwindcss";

/**
 * Emberlend design tokens — derived from the "Two Doors" screenshot,
 * pushed to a darker warm-black base per spec.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080503",
        surface: "#140D09",
        "surface-raised": "#1E1410",
        border: "#3A2318",
        primary: {
          DEFAULT: "#F26522",
          bright: "#FF7A33",
          dim: "#B84E1A",
        },
        text: {
          DEFAULT: "#F5EDE8",
          muted: "#A2938B",
        },
        success: "#4ADE80",
        danger: "#E5484D",
      },
      backgroundImage: {
        "ember-glow":
          "radial-gradient(circle at 50% 0%, rgba(242,101,34,0.15), transparent 60%)",
        "ember-btn": "linear-gradient(90deg, #E85D2A 0%, #B97A7C 100%)",
      },
      boxShadow: {
        ember: "0 0 40px -8px rgba(242,101,34,0.35)",
        "ember-sm": "0 0 20px -6px rgba(242,101,34,0.30)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
