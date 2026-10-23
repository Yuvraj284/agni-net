/**
 * Semantic design tokens. Every colour resolves to a CSS variable defined in src/index.css,
 * with separate values for light (default) and dark (`html.dark`) themes. Components use only
 * these names — never raw palette colours — so both themes stay consistent.
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        fg: { DEFAULT: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle') },
        accent: { DEFAULT: v('accent'), strong: v('accent-strong'), fg: v('accent-fg') },
        ember: v('ember'),
        // Priority bands & status semantics (same meaning in both themes)
        critical: v('critical'),
        high: v('high'),
        medium: v('medium'),
        low: v('low'),
        info: v('info'),
        success: v('success'),
        asset: {
          protected: v('asset-protected'),
          forest: v('asset-forest'),
          infra: v('asset-infra'),
          settlement: v('asset-settlement'),
          heat: v('asset-heat'),
        },
        factor: { c: v('factor-c'), r: v('factor-r'), f: v('factor-f'), a: v('factor-a') },
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '17px'],
        '13': ['13px', '19px'],
        sm: ['14px', '20px'],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / var(--shadow-a1)), 0 1px 1px rgb(var(--shadow) / var(--shadow-a2))',
        raised: '0 2px 6px -1px rgb(var(--shadow) / var(--shadow-a2)), 0 1px 2px rgb(var(--shadow) / var(--shadow-a1))',
        pop: '0 12px 32px -8px rgb(var(--shadow) / var(--shadow-a3)), 0 2px 6px rgb(var(--shadow) / var(--shadow-a1))',
      },
      keyframes: {
        'drawer-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-up': 'fade-up 160ms ease-out',
      },
    },
  },
  plugins: [],
};
