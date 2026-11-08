import { Scene, parseScene } from '@glowframe/schema';

export const TUX_SVG_PATH =
  'M 50 12 ' +
  'C 62 12 66 22 66 30 ' +
  'C 66 33 72 36 70 39 ' +
  'C 68 41 64 40 62 40 ' +
  'C 64 45 78 52 85 64 ' +
  'C 88 70 84 75 79 73 ' +
  'C 74 71 71 63 68 58 ' +
  'C 69 68 72 78 68 84 ' +
  'C 74 85 82 89 78 93 ' +
  'C 74 96 62 94 57 88 ' +
  'C 53 87 51 87 49 87 ' +
  'C 47 87 43 88 38 93 ' +
  'C 34 96 22 96 26 89 ' +
  'C 28 85 34 85 32 84 ' +
  'C 28 78 31 68 32 58 ' +
  'C 29 63 26 71 21 73 ' +
  'C 16 75 12 70 15 64 ' +
  'C 22 52 36 45 38 40 ' +
  'C 36 40 32 41 30 39 ' +
  'C 28 36 34 33 34 30 ' +
  'C 34 22 38 12 50 12 Z';

export const tuxScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'tux-prism',
    name: 'Tux Linux Mascot',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['linux', 'tux', 'dark', 'mascot'],
    description: 'Iconic Tux penguin silhouette with glowing prismatic edge light',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.6 },
  },
  shape: {
    type: 'svg-path',
    d: TUX_SVG_PATH,
    viewBox: [0, 0, 100, 100],
    position: [0.5, 0.52],
    scale: 0.32,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.004,
    falloff: 0.08,
    intensity: 1.1,
    dispersion: 0.35,
  },
  palettes: [
    ['oklch(0.8 0.18 130)', 'oklch(0.75 0.22 85)', 'oklch(0.7 0.2 35)', 'oklch(0.65 0.18 200)'],
    ['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.7 0.18 250)', 'oklch(0.8 0.2 150)'],
  ],
  mode: {
    id: 'glow',
    params: {},
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3.2,
    smoothing: 0.12,
    idleOrbit: true,
    idleTimeoutMs: 3000,
  },
  onClick: {
    object: [{ action: 'next-palette' }],
    background: [{ action: 'none' }],
  },
  performance: {
    fpsCap: 60,
    resolutionScale: 1.0,
  },
});
