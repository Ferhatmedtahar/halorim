import { Scene, parseScene } from '@glowframe/schema';

export const FOUR_PANE_SVG_PATH =
  'M 16 14 H 46 C 47.5 14 48 14.5 48 16 V 46 C 48 47.5 47.5 48 46 48 H 16 C 14.5 48 14 47.5 14 46 V 16 C 14 14.5 14.5 14 16 14 Z ' +
  'M 54 14 H 84 C 85.5 14 86 14.5 86 16 V 46 C 86 47.5 85.5 48 84 48 H 54 C 52.5 48 52 47.5 52 46 V 16 C 52 14.5 52.5 14 54 14 Z ' +
  'M 16 52 H 46 C 47.5 52 48 52.5 48 54 V 84 C 48 85.5 47.5 86 46 86 H 16 C 14.5 86 14 85.5 14 84 V 54 C 14 52.5 14.5 52 16 52 Z ' +
  'M 54 52 H 84 C 85.5 52 86 52.5 86 54 V 84 C 86 85.5 85.5 86 84 86 H 54 C 52.5 86 52 85.5 52 84 V 54 C 52 52.5 52.5 52 54 52 Z';

export const fourPaneScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'four-pane',
    name: 'Generic Four-Pane Window',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['windows', 'minimal', 'panes', 'dark'],
    description: 'Generic four-pane window silhouette with glowing prismatic division',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.65 },
  },
  shape: {
    type: 'svg-path',
    d: FOUR_PANE_SVG_PATH,
    viewBox: [0, 0, 100, 100],
    position: [0.5, 0.5],
    scale: 0.3,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.0035,
    falloff: 0.085,
    intensity: 1.05,
    dispersion: 0.35,
  },
  palettes: [
    ['oklch(0.7 0.18 220)', 'oklch(0.75 0.2 260)', 'oklch(0.8 0.19 190)', 'oklch(0.7 0.22 300)'],
    ['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.7 0.18 250)', 'oklch(0.8 0.2 150)'],
  ],
  mode: {
    id: 'glow',
    params: {},
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3.0,
    smoothing: 0.12,
    idleOrbit: true,
    idleTimeoutMs: 3000,
  },
  onClick: {
    object: [{ action: 'next-palette' }, { action: 'ripple' }],
    background: [{ action: 'none' }],
  },
  performance: {
    fpsCap: 30,
    resolutionScale: 0.5,
  },
});
