/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neon: {
          green:  '#00ff88',
          pink:   '#ff00ff',
          blue:   '#00d4ff',
          purple: '#a855f7',
          yellow: '#ffd700',
        },
        glass: {
          light: 'rgba(255,255,255,0.12)',
          dark:  'rgba(10,10,30,0.55)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-neon':    'pulseNeon 2s ease-in-out infinite',
        'float':         'float 6s ease-in-out infinite',
        'gradient-x':   'gradientX 8s ease infinite',
        'spin-slow':    'spin 8s linear infinite',
        'fade-in':      'fadeIn 0.5s ease forwards',
        'slide-up':     'slideUp 0.4s ease forwards',
        'glow':         'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseNeon: {
          '0%,100%': { boxShadow: '0 0 8px #00ff88, 0 0 20px #00ff8844' },
          '50%':     { boxShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff44' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-16px)' },
        },
        gradientX: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(30px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        glow: {
          from: { textShadow: '0 0 8px #00ff88' },
          to:   { textShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
