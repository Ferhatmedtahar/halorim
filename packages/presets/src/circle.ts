import { Scene, parseScene } from '@glowframe/schema';

export const circleScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'matrix-circle',
    name: 'Matrix Circle',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['minimal', 'circle', 'emerald', 'spectrum-cycle'],
    description: 'Minimalist glowing ring with continuously shifting emerald hues',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.65 },
  },
  shape: {
    type: 'preset',
    preset: 'circle',
    position: [0.5, 0.5],
    scale: 0.35,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.0035,
    falloff: 0.08,
    intensity: 1.05,
    dispersion: 0.35,
  },
  palettes: [
    ['oklch(0.8 0.22 145)', 'oklch(0.75 0.24 165)', 'oklch(0.7 0.2 195)', 'oklch(0.82 0.18 130)'],
    ['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.7 0.18 250)', 'oklch(0.8 0.2 150)'],
  ],
  mode: {
    id: 'spectrum-cycle',
    params: { speed: 0.12 },
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
