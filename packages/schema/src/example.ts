import { Scene } from './v1.js';

export const exampleScene: Scene = {
  schemaVersion: 1,
  meta: {
    id: 'triangle-prism',
    name: 'Prism Triangle',
    author: 'Your Name',
    license: 'CC0-1.0',
    tags: ['minimal', 'dark', 'triangle'],
  },
  background: {
    color: '#000000',
    haze: {
      intensity: 0.6,
    },
  },
  shape: {
    type: 'preset',
    preset: 'triangle',
    position: [0.5, 0.52],
    scale: 0.28,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.004,
    falloff: 0.09,
    intensity: 1.0,
    dispersion: 0.35,
  },
  palettes: [
    ['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.7 0.18 250)', 'oklch(0.8 0.2 150)'],
    ['oklch(0.8 0.18 80)', 'oklch(0.7 0.22 40)', 'oklch(0.65 0.25 20)'],
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
    background: [],
  },
  performance: {
    fpsCap: 30,
    resolutionScale: 0.5,
  },
};
