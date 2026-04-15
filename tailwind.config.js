/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#eeede8',   // warm parchment page background
          light: '#ffffff',      // white card surface
          surface: '#f5f3ee',   // secondary surface
          dark: '#1a1a1a',      // topbar / bottombar
          accent: '#b5a53a',    // olive gold — active tabs, primary buttons
          pink: '#e8a4b8',      // soft pink accent
          terra: '#d05a3a',     // terracotta — danger / warnings
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
