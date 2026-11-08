import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        background: '#07090e',
        surface: '#0d111a',
        'surface-elevated': '#141a27',
        border: 'rgba(255, 255, 255, 0.12)',
        'border-active': 'rgba(255, 255, 255, 0.28)',
        terminal: {
          bg: '#07090e',
          card: '#0c1018',
          border: '#1e283a',
          cyan: '#38bdf8',
          green: '#10b981',
          amber: '#f59e0b',
          pink: '#f43f5e',
          text: '#e2e8f0',
          dim: '#64748b',
        },
      },
      boxShadow: {
        'terminal-glow': '0 0 20px rgba(56, 189, 248, 0.15)',
        'terminal-green': '0 0 20px rgba(16, 185, 129, 0.15)',
        'terminal-amber': '0 0 20px rgba(245, 158, 11, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
