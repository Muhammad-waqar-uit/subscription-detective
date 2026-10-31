/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Muted ink scale — the whole UI is built from this, so nothing is loud.
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#dde1e8",
          300: "#c3c9d4",
          400: "#979fae",
          500: "#6d7688",
          600: "#545d6e",
          700: "#414957",
          800: "#2e343f",
          900: "#1e232b"
        },
        // Low-saturation accents, for status only.
        sage: {
          50: "#eef4f0",
          100: "#dceae1",
          600: "#3d6b52",
          700: "#335a45"
        },
        clay: {
          50: "#f6f0e7",
          100: "#ece0cd",
          600: "#7d5f33",
          700: "#684e29"
        },
        rust: {
          50: "#f8efee",
          100: "#efdcd9",
          600: "#9d4a43",
          700: "#853d37"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif"
        ]
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 35, 43, 0.04)",
        raised: "0 8px 24px rgba(30, 35, 43, 0.10), 0 1px 2px rgba(30, 35, 43, 0.06)"
      }
    }
  },
  plugins: []
}
