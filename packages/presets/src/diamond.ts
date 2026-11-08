import { Scene, parseScene } from '@glowframe/schema';

export const DIAMOND_SVG_PATH =
  'M 50 15 ' +
  'L 78 38 ' +
  'L 50 85 ' +
  'L 22 38 Z ' +
  'M 36 38 L 50 85 L 64 38 Z ' +
  'M 36 38 L 50 15 L 64 38 Z';

export const diamondScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'diamond-prism',
    name: 'Diamond Facet',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['gemstone', 'geometry', 'crystal', 'sharp'],
    description: 'Precision brilliant-cut crystal diamond with caustic prismatic refraction',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: DIAMOND_SVG_PATH,
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
    falloff: 0.038,
    intensity: 1.15,
    dispersion: 0.42,
  },
  palettes: [
    ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#ffffff'],
    ['#10b981', '#06b6d4', '#3b82f6', '#6366f1'],
    ['#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'],
    ['#ffffff', '#cbd5e1', '#64748b', '#1e293b'],
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
