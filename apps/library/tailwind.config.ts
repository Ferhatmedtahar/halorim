import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Glowframe site design tokens.
 * Monochrome, flat: separation comes from surface contrast, never borders or shadows.
 * The only chromatic thing on the site is the glow itself (wallpaper content).
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        bg: '#050505',
        surface: '#0b0b0b',
        raised: '#141414',
        hover: '#1c1c1c',
        line: '#242424',
        fg: '#e8e8e8',
        muted: { DEFAULT: '#8a8a8a', foreground: '#8a8a8a' },
        // shadcn/ui semantic tokens, mapped to the flat palette.
        // border/input are transparent on purpose: surfaces separate by contrast, never by lines.
        background: '#050505',
        foreground: '#e8e8e8',
        border: 'transparent',
        input: 'transparent',
        ring: '#e8e8e8',
        popover: { DEFAULT: '#141414', foreground: '#e8e8e8' },
        accent: { DEFAULT: '#1c1c1c', foreground: '#e8e8e8' },
        secondary: { DEFAULT: '#141414', foreground: '#e8e8e8' },
        primary: { DEFAULT: '#e8e8e8', foreground: '#050505' },
      },
      borderColor: { DEFAULT: 'transparent' },
      boxShadow: {
        // Flat: every shadow utility (including those inside shadcn components) resolves to nothing.
        DEFAULT: 'none',
        xs: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
      },
      spacing: {
        18: '72px',
        24: '96px',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        slow: '550ms',
      },
      maxWidth: {
        site: '1178px',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 550ms cubic-bezier(0.4, 0, 0.2, 1) both',
      },
    },
  },
  plugins: [animate],
};

export default config;
