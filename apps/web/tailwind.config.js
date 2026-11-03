/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#f2f7f4',
          100: '#e1ede7',
          200: '#c5dcd2',
          600: '#1e4632',
          700: '#1a3a2a',
          800: '#142e21',
          900: '#0f241a',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          warm: '#c86446',
          amber: '#d97736',
          sand: '#f5f0e6',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        ivory: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f2eb',
          300: '#ebe6db',
          400: '#ddd6c7',
        },
        forest: {
          DEFAULT: '#1a3a2a',
          light: '#24513b',
          dark: '#12291e',
        },
        terracotta: {
          DEFAULT: '#c86446',
          light: '#d97759',
          dark: '#a84c30',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(26, 58, 42, 0.08), 0 2px 6px -1px rgba(26, 58, 42, 0.04)',
        'warm-lg': '0 10px 30px -4px rgba(26, 58, 42, 0.12), 0 4px 12px -2px rgba(26, 58, 42, 0.06)',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
