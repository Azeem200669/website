/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Use data-theme attribute instead of .dark class
  darkMode: ["selector", "[data-theme='dark']"],

  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        sidebar:    "var(--sidebar)",
        card:       "var(--card)",
        primary:    "var(--primary)",
        secondary:  "var(--secondary)",
        success:    "var(--success)",
        danger:     "var(--danger)",
        "app-text": "var(--text)",
        muted:      "var(--muted)",
        border:     "var(--border)",
      },
    },
  },
  plugins: [],
}