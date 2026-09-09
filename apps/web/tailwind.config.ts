import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        mint: 'rgb(var(--c-mint) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
      },
      borderRadius: { xl: '16px', '2xl': '20px', '3xl': '26px' },
      fontFamily: { sans: ['var(--font-sans)', 'ui-rounded', 'system-ui', 'sans-serif'] },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-line) / 1), 0 18px 50px -24px rgb(0 0 0 / 0.9)',
        lift: '0 24px 60px -30px rgb(0 0 0 / 0.95)',
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-brand) / 0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgb(var(--c-brand) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-brand) / 0)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
