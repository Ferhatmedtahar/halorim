import { Scene, parseScene } from '@glowframe/schema';

export const ARCH_SVG_PATH =
  'M 50 14 ' +
  'C 47 22, 42 33, 37 43 ' +
  'C 40 46, 44 49, 49 51 ' +
  'C 42 54, 36 57, 31 60 ' +
  'C 24 74, 16 87, 12 90 ' +
  'C 20 86, 28 81, 35 77 ' +
  'C 39 75, 43 73, 47 71 ' +
  'C 45 75, 44 80, 43 86 ' +
  'C 47 81, 51 77, 55 73 ' +
  'C 59 77, 63 81, 67 86 ' +
  'C 66 80, 65 75, 63 71 ' +
  'C 67 73, 71 75, 75 77 ' +
  'C 82 81, 90 86, 98 90 ' +
  'C 94 87, 86 74, 79 60 ' +
  'C 74 57, 68 54, 61 51 ' +
  'C 66 49, 70 46, 73 43 ' +
  'C 68 33, 63 22, 60 14 ' +
  'C 55 12, 53 12, 50 14 Z';

export const archScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'arch-prism',
    name: 'Arch Linux Apex',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['linux', 'arch', 'minimal', 'cyber'],
    description: 'Iconic Arch Linux geometric crest with laser-focused cyan spectrum falloff',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
  },
  shape: {
    type: 'svg-path',
    d: ARCH_SVG_PATH,
    viewBox: [0, 0, 110, 100],
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
    intensity: 1.1,
    dispersion: 0.38,
  },
  palettes: [
    ['#1793d1', '#38bdf8', '#0284c7', '#ffffff', '#0ea5e9'],
    ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e'],
    ['#ffffff', '#cbd5e1', '#64748b', '#334155'],
    ['#22c55e', '#10b981', '#06b6d4', '#3b82f6'],
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
