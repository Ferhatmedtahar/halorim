import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Halorim site design tokens.
 * Black and white only. Sharp corners everywhere (radius 0), muted hairlines instead of shadows,
 * surfaces butted against each other with no gaps. The only colour on the site is the wallpaper
 * content itself (thumbnails and live previews).
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
        bg: '#0a0a0a',
        surface: '#0e0e0e',
        raised: '#131313',
        hover: '#1a1a1a',
        line: '#242424',
        'line-strong': '#3a3a3a',
        fg: '#ededed',
        muted: { DEFAULT: '#8a8a8a', foreground: '#8a8a8a' },
        // shadcn/ui semantic tokens, mapped to the same palette.
        background: '#0a0a0a',
        foreground: '#ededed',
        border: '#242424',
        input: '#242424',
        ring: '#ededed',
        popover: { DEFAULT: '#0e0e0e', foreground: '#ededed' },
        accent: { DEFAULT: '#1a1a1a', foreground: '#ededed' },
        secondary: { DEFAULT: '#131313', foreground: '#ededed' },
        primary: { DEFAULT: '#ededed', foreground: '#0a0a0a' },
      },
      borderColor: { DEFAULT: '#242424' },
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
      // rounded = 0, on purpose. Every radius utility (including `rounded-full`) resolves to square.
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        slow: '550ms',
      },
      maxWidth: {
        site: '1180px',
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
