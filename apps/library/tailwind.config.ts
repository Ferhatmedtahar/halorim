import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: '#12141c',
        'surface-elevated': '#1a1d29',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-active': 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
