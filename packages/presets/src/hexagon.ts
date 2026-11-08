import { Scene, parseScene } from '@glowframe/schema';

export const hexagonScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'hexagon-prism',
    name: 'Prism Hexagon',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['geometric', 'minimal', 'hexagon', 'pulse'],
    description: 'Pulsing geometric hexagon rim glow on deep black canvas',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.6 },
  },
  shape: {
    type: 'preset',
    preset: 'hexagon',
    position: [0.5, 0.5],
    scale: 0.32,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.004,
    falloff: 0.085,
    intensity: 1.1,
    dispersion: 0.35,
  },
  palettes: [
    ['oklch(0.75 0.22 190)', 'oklch(0.7 0.24 330)', 'oklch(0.8 0.2 75)', 'oklch(0.7 0.2 240)'],
    ['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.7 0.18 250)', 'oklch(0.8 0.2 150)'],
  ],
  mode: {
    id: 'pulse',
    params: { speed: 1.5, depth: 0.35 },
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
    object: [{ action: 'next-palette' }, { action: 'burst' }],
    background: [{ action: 'none' }],
  },
  performance: {
    fpsCap: 30,
    resolutionScale: 0.5,
  },
});
