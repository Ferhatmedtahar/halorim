import { Scene, parseScene } from '@glowframe/schema';

export const starScene: Scene = parseScene({
  schemaVersion: 1,
  meta: {
    id: 'cyber-star',
    name: 'Cyber Star',
    author: 'Glowframe Team',
    license: 'CC0-1.0',
    tags: ['star', 'cyberpunk', 'neon', 'sweep'],
    description: 'Radiant 5-pointed star with scanning light beam sweep effect',
  },
  background: {
    color: '#000000',
    haze: { intensity: 0.7 },
  },
  shape: {
    type: 'preset',
    preset: 'star',
    position: [0.5, 0.52],
    scale: 0.34,
    rotation: 0,
  },
  fill: {
    color: '#000000',
    content: null,
  },
  edge: {
    width: 0.0038,
    falloff: 0.09,
    intensity: 1.15,
    dispersion: 0.4,
  },
  palettes: [
    ['oklch(0.7 0.25 310)', 'oklch(0.8 0.22 80)', 'oklch(0.75 0.24 350)', 'oklch(0.65 0.2 270)'],
    ['oklch(0.8 0.2 140)', 'oklch(0.75 0.22 220)', 'oklch(0.7 0.25 30)'],
  ],
  mode: {
    id: 'sweep',
    params: { speed: 0.45, width: 0.07, intensity: 2.0 },
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3.5,
    smoothing: 0.12,
    idleOrbit: true,
    idleTimeoutMs: 3000,
  },
  onClick: {
    object: [{ action: 'next-palette' }, { action: 'ripple' }],
    background: [{ action: 'none' }],
  },
  performance: {
    fpsCap: 60,
    resolutionScale: 1.0,
  },
});
