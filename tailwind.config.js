/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './{components,services}/**/*.{js,ts,jsx,tsx}', './*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Rajdhani"', 'sans-serif'],
      },
      colors: {
        cyber: {
          black: '#050505',
          dark: '#0a0a0a',
          panel: '#111111',
          cyan: '#00f0ff',
          pink: '#ff003c',
          yellow: '#fcee0a',
          dim: '#ffffff20',
        },
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glitch: 'glitch 1s linear infinite',
      },
      keyframes: {
        glitch: {
          '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
          '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
          '62%': { transform: 'translate(0,0) skew(5deg)' },
        },
      },
    },
  },
  plugins: [],
};
