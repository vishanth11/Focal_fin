/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#F7F7F2',
        dark: '#EAEAE2',
        surface: '#FFFFFF',
        card: '#F0F0EA',
        borderDark: '#DCDCD5',
        textDark: '#111111',
        textMuted: '#666666',
        neon: {
          yellow: '#DFFF00',
          green: '#39FF88',
        },
        risk: {
          verified: '#39FF88',
          warning: '#DFFF00',
          high: '#FF3B30',
          unknown: '#888888'
        }
      },
      fontFamily: {
        mono: ['Space Grotesk', 'Courier New', 'monospace'],
        sans: ['Space Grotesk', 'Sora', 'Inter', 'sans-serif'],
        display: ['Space Grotesk', 'Sora', 'sans-serif'],
      },
      animation: {
        'scan-line': 'scan 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'dash-flow': 'dashFlow 15s linear infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(223, 255, 0, 0.6))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(223, 255, 0, 0.2))' },
        },
        dashFlow: {
          to: { strokeDashoffset: '-100' }
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      }
    },
  },
  plugins: [],
}
