/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        bg: {
          base:    '#080b14',
          surface: '#0d1120',
          card:    '#131926',
        },
        accent: {
          primary:   '#6366f1',
          secondary: '#8b5cf6',
          green:     '#10b981',
          amber:     '#f59e0b',
          red:       '#ef4444',
          cyan:      '#06b6d4',
        },
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'fade-in':   'fade-in-up 0.4s ease forwards',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
