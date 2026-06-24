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
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        bg: {
          base:    '#111110',
          surface: '#1C1C1A',
          card:    '#1C1C1A',
        },
        accent: {
          primary:   '#FF6B00',
          secondary: '#F5F0E8',
          green:     '#22C55E',
          amber:     '#FF6B00',
          red:       '#C41E3A',
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
