import { Scene, parseScene } from '@glowframe/schema';

export const PHANTOM_SVG_PATH =
  'M 20 50 ' +
  'C 20 30, 32 18, 50 18 ' +
  'C 68 18, 80 30, 80 50 ' +
  'L 80 82 ' +
  'C 75 77, 70 77, 65 82 ' +
  'C 60 87, 55 87, 50 82 ' +
  'C 45 77, 40 77, 35 82 ' +
  'C 30 87, 25 87, 20 82 Z ' +
  'M 38 42 A 5 5 0 1 0 38 41.9 Z ' +
  'M 62 42 A 5 5 0 1 0 62 41.9 Z';

export const phantomScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'retro-ghost',
    name: 'Phantom Arcade',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['arcade', 'retro', 'gaming', 'ghost'],
    description: 'Nostalgic 8-bit arcade phantom with neon spectral edge glow and reactive eyes',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: PHANTOM_SVG_PATH,
    viewBox: [0, 0, 100, 100],
    closeGaps: 0,
    position: [0.5, 0.52],
    scale: 0.33,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.0035,
    falloff: 0.04,
    intensity: 1.15,
    dispersion: 0.38,
  },
  palettes: [
    ['#ef4444', '#f87171', '#fca5a5', '#ffffff'], // Blinky Red
    ['#06b6d4', '#67e8f9', '#a5f3fc', '#ffffff'], // Inky Cyan
    ['#f472b6', '#fbcfe8', '#f43f5e', '#ffffff'], // Pinky Pink
    ['#fbbf24', '#fde68a', '#f59e0b', '#ffffff'], // Clyde Amber
  ],
  mode: {
    id: 'rotate',
    params: {
      speed: 0.05,
    },
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3.5,
    smoothing: 0.5,
    idleOrbit: false,
    idleTimeoutMs: 2000,
  },
  onClick: {
    object: [{ action: 'next-palette' }],
    background: [{ action: 'next-palette' }],
  },
  performance: {
    fpsCap: 60,
    resolutionScale: 1.0,
  },
});
