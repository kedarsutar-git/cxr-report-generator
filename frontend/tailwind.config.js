export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#ecfeff', 100:'#cffafe', 300:'#67e8f9', 400:'#22d3ee',
          500:'#06b6d4', 600:'#0891b2', 700:'#0e7490', 900:'#164e63'
        },
        aurora: {
          cyan:   '#06b6d4',
          teal:   '#14b8a6',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          rose:   '#f43f5e',
        },
        ink: {
          950: '#050914',
          900: '#0a0f1f',
          800: '#111827',
          700: '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 40px -10px rgba(6, 182, 212, 0.5)',
        'glow-rose': '0 0 40px -10px rgba(244, 63, 94, 0.4)',
        'glow-emerald': '0 0 40px -10px rgba(16, 185, 129, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' },
                     '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'scan':    { '0%': { top: '0%' }, '100%': { top: '100%' } },
        'aurora': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%':      { transform: 'translate(30px,-30px) scale(1.1)' },
          '66%':      { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1,   filter: 'brightness(1)' },
          '50%':      { opacity: 0.7, filter: 'brightness(1.3)' },
        },
        'shimmer': { '100%': { transform: 'translateX(100%)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'bounce-in': {
          '0%':   { transform: 'scale(0.9)', opacity: 0 },
          '60%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.45s cubic-bezier(.21,1.02,.73,1) forwards',
        'fade-in':    'fade-in 0.3s ease-out forwards',
        'scan':       'scan 2s ease-in-out infinite',
        'aurora':     'aurora 20s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s infinite',
        'spin-slow':  'spin-slow 8s linear infinite',
        'bounce-in':  'bounce-in 0.4s cubic-bezier(.21,1.02,.73,1) forwards',
      },
    },
  },
  plugins: [],
};