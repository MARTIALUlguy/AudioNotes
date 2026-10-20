/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a2e',
        'primary-light': '#16213e',
        accent: '#0f3460',
        'accent-light': '#e94560',
        surface: '#16213e',
        success: '#00d4ff',
        error: '#ff6b6b',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'record-pulse': 'recordPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        recordPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
