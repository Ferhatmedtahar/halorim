import { Scene, parseScene } from '@glowframe/schema';

export const DEBIAN_SVG_PATH =
  'M 46 14 ' +
  'C 68 14 86 31 86 52 ' +
  'C 86 73 70 89 48 89 ' +
  'C 27 89 12 73 12 52 ' +
  'C 12 34 25 19 42 19 ' +
  'C 57 19 68 30 68 45 ' +
  'C 68 58 58 68 46 68 ' +
  'C 36 68 28 60 28 50 ' +
  'C 28 42 34 36 42 36 ' +
  'C 47 36 51 40 51 45 ' +
  'C 51 48 49 51 46 51 ' +
  'C 44 51 42 49 42 46 ' +
  'C 42 44 43 42 44 42 ' +
  'C 41 42 38 46 38 50 ' +
  'C 38 56 42 62 48 62 ' +
  'C 55 62 62 55 62 45 ' +
  'C 62 33 53 25 41 25 ' +
  'C 29 25 18 36 18 51 ' +
  'C 18 69 31 83 49 83 ' +
  'C 67 83 80 69 80 52 ' +
  'C 80 34 65 20 46 20 ' +
  'C 39 20 33 22 27 25 ' +
  'L 26 19 ' +
  'C 32 16 39 14 46 14 Z';

export const debianScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'debian-swirl',
    name: 'Debian Swirl',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['linux', 'debian', 'open-source', 'spiral'],
    description: 'Iconic Debian spiral vortex with ruby red and crimson prismatic edge glow',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: DEBIAN_SVG_PATH,
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
    width: 0.0035,
    falloff: 0.04,
    intensity: 1.15,
    dispersion: 0.4,
  },
  palettes: [
    ['#d70a53', '#f43f5e', '#fb7185', '#fda4af', '#ffffff'],
    ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4'],
    ['#f59e0b', '#ef4444', '#7c3aed', '#2563eb'],
    ['#ffffff', '#e2e8f0', '#94a3b8', '#1e293b'],
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
