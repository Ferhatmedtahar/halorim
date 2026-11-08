import { Scene, parseScene } from '@glowframe/schema';

/**
 * Clean, iconic, sleek Linux Tux penguin mascot silhouette.
 * Symmetrical, proportional contours with smooth head, flared flippers, and webbed feet.
 */
export const TUX_SVG_PATH =
  'M 50 12 ' +
  'C 42 12, 36 18, 36 26 ' +
  'C 36 32, 40 36, 38 42 ' +
  'C 34 50, 20 58, 20 68 ' +
  'C 20 74, 24 76, 28 72 ' +
  'C 32 68, 35 60, 36 56 ' +
  'C 35 66, 34 76, 38 82 ' +
  'C 34 84, 28 86, 28 90 ' +
  'C 28 93, 38 94, 46 88 ' +
  'C 48 86, 50 86, 50 86 ' +
  'C 50 86, 52 86, 54 88 ' +
  'C 62 94, 72 93, 72 90 ' +
  'C 72 86, 66 84, 62 82 ' +
  'C 66 76, 65 66, 64 56 ' +
  'C 65 60, 68 68, 72 72 ' +
  'C 76 76, 80 74, 80 68 ' +
  'C 80 58, 66 50, 62 42 ' +
  'C 60 36, 64 32, 64 26 ' +
  'C 64 18, 58 12, 50 12 Z';

export const tuxScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'tux-prism',
    name: 'Tux Linux Mascot',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['linux', 'tux', 'mascot', 'open-source'],
    description: 'Iconic sleek Tux penguin silhouette with glowing prismatic edge light',
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
    width: 0.0035,
    falloff: 0.045,
    intensity: 1.15,
    dispersion: 0.35,
  },
  palettes: [
    ['#facc15', '#f59e0b', '#38bdf8', '#0284c7', '#ffffff'],
    ['#10b981', '#34d399', '#3b82f6', '#a855f7'],
    ['#ffffff', '#cbd5e1', '#64748b', '#0f172a'],
    ['#f43f5e', '#fb923c', '#eab308', '#22c55e'],
  ],
  mode: {
    id: 'rotate',
    params: {
      speed: 0.04,
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
