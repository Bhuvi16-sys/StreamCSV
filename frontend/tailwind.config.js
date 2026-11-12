/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        obsidian: {
          0: '#000000',
          50: '#0a0a0a',
          100: '#111111',
          150: '#171717',
          200: '#1c1c1c',
          300: '#262626',
          400: '#404040',
          500: '#525252',
          600: '#737373',
          700: '#a1a1aa',
          800: '#d4d4d8',
          900: '#f4f4f5',
        }
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'bar-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
        'bar-fill': 'bar-fill 0.8s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}
