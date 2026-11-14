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
        background: '#0D1117',
        surface: {
          DEFAULT: '#161B22',
          dim: '#0D1117',
          high: '#21262D',
          higher: '#30363D'
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
