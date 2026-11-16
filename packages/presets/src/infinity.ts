import { Scene, parseScene } from '@glowframe/schema';

export const INFINITY_SVG_PATH =
  'M 28 50 ' +
  'C 28 34, 42 34, 50 46 ' +
  'C 58 34, 72 34, 72 50 ' +
  'C 72 66, 58 66, 50 54 ' +
  'C 42 66, 28 66, 28 50 Z ' +
  'M 34 50 ' +
  'C 34 58, 43 58, 48 50 ' +
  'C 43 42, 34 42, 34 50 Z ' +
  'M 66 50 ' +
  'C 66 42, 57 42, 52 50 ' +
  'C 57 58, 66 58, 66 50 Z';

export const infinityScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'infinity-loop',
    name: 'Infinity Lemniscate',
    author: 'Halorim Team',
    license: 'CC0-1.0',
    tags: ['minimal', 'geometry', 'math', 'loop'],
    description: 'Harmonic infinity lemniscate ribbon with flowing prismatic light waves',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: INFINITY_SVG_PATH,
    viewBox: [0, 0, 100, 100],
    closeGaps: 0,
    position: [0.5, 0.52],
    scale: 0.34,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.0035,
    falloff: 0.038,
    intensity: 1.05,
    dispersion: 0.35,
  },
  palettes: [
    ['#a855f7', '#ec4899', '#f43f5e', '#3b82f6', '#06b6d4'],
    ['#00dfd8', '#0070f3', '#7928ca', '#ff0080'],
    ['#ffffff', '#e2e8f0', '#94a3b8', '#334155'],
    ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
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
    sharpness: 3.5,
    smoothing: 0.04,
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
