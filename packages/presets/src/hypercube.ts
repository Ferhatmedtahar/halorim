import { Scene, parseScene } from '@glowframe/schema';

export const HYPERCUBE_SVG_PATH =
  'M 20 20 L 80 20 L 80 80 L 20 80 Z ' +
  'M 36 36 L 64 36 L 64 64 L 36 64 Z ' +
  'M 20 20 L 36 36 ' +
  'M 80 20 L 64 36 ' +
  'M 80 80 L 64 64 ' +
  'M 20 80 L 36 64';

export const hypercubeScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'hypercube',
    name: 'Tesseract Hypercube',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['cyber', '4d', 'matrix', 'wireframe', 'math'],
    description: 'Orthographic wireframe 4D tesseract with dimension-bending chromatic dispersion',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: HYPERCUBE_SVG_PATH,
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
    intensity: 1.2,
    dispersion: 0.45,
  },
  palettes: [
    ['#00ff66', '#00e5ff', '#7000ff', '#ff007b'],
    ['#22d3ee', '#818cf8', '#c084fc', '#f43f5e'],
    ['#f59e0b', '#fbbf24', '#f87171', '#ef4444'],
    ['#ffffff', '#e2e8f0', '#64748b', '#0f172a'],
  ],
  mode: {
    id: 'rotate',
    params: {
      speed: 0.06,
    },
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3.8,
    smoothing: 0.55,
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
