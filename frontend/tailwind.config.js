/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F1B18',
        cream: '#F7F1E6',
        paper: '#FCF8F1',
        clay: {
          DEFAULT: '#B4552D',
          dark: '#8B3C1D',
          light: '#D98B64',
        },
        sage: '#7C8471',
        sand: '#E8DDCC',
        muted: '#7C7268',
        ochre: '#C7A252',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 60px -28px rgba(35, 31, 32, 0.35)',
        card: '0 8px 30px -18px rgba(35, 31, 32, 0.28)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fadeUp .55s ease both',
        marquee: 'marquee 30s linear infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
