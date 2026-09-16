export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eef6ff',100:'#d9ecff',300:'#7cc0ff',500:'#0d84ff',600:'#0069e0',700:'#0055b8' },
        ink:   { 900:'#0b1220', 800:'#131c2e', 700:'#1e2a42' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' },
                     '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer:   { '100%': { transform: 'translateX(100%)' } },
        scan:      { '0%': { top: '0%' }, '100%': { top: '100%' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.21,1.02,.73,1) forwards',
        shimmer: 'shimmer 1.6s infinite',
        scan: 'scan 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};