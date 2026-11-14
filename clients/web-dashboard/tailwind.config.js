/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: {
          DEFAULT: '#111827',
          dim: '#0F131C',
          high: '#1E293B',
          higher: '#334155'
        },
        hazard: {
          low: '#10B981',      // Muted Emerald
          warning: '#F59E0B',  // Warm Amber
          critical: '#EF4444', // Refined Crimson
          info: '#38BDF8'      // Sky Cyan
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
