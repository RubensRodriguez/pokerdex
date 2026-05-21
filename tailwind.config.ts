import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        border: {
          DEFAULT: "var(--border)",
          2: "var(--border-2)",
        },
        text: {
          DEFAULT: "var(--text)",
          dim: "var(--text-dim)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          2: "var(--muted-2)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hi: "var(--accent-hi)",
          dim: "var(--accent-dim)",
          line: "var(--accent-line)",
          foreground: "var(--accent-foreground)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          bg: "var(--positive-bg)",
          "bg-2": "var(--positive-bg-2)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          bg: "var(--negative-bg)",
          "bg-2": "var(--negative-bg-2)",
        },
        // shadcn component colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
};

export default config;
