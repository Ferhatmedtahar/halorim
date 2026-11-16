import { Scene, parseScene } from '@glowframe/schema';

export const triangleScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'triangle-prism',
    name: 'Prism Triangle',
    author: 'Halorim Team',
    license: 'CC0-1.0',
    tags: ['minimal', 'dark', 'triangle'],
    description: 'Reference equilateral triangle with prismatic rim glow on black canvas',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.0 },
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
    width: 0.003,
    falloff: 0.035,
    intensity: 0.95,
    dispersion: 0.35,
  },
  palettes: [
    ['#ffffff', '#e2e8f0', '#ffffff', '#cbd5e1'],
    ['#ff1e56', '#a855f7', '#0070f3', '#00dfd8', '#10b981'],
    ['#fbbf24', '#f59e0b', '#d97706', '#ef4444'],
    ['#10b981', '#34d399', '#06b6d4', '#3b82f6'],
    ['#c084fc', '#a855f7', '#7c3aed', '#ec4899'],
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
    smoothing: 0.04,
    idleOrbit: false,
    idleTimeoutMs: 1500,
  },
  onClick: {
    object: [
      { action: 'next-palette' },
    ],
    background: [
      { action: 'next-palette' },
    ],
  },
  performance: {
    fpsCap: 60,
    resolutionScale: 1.0,
  },
});
