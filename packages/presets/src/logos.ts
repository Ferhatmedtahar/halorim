import { type Scene, parseScene } from '@glowframe/schema';
import { LOGOS, type LogoDef } from './logo-data.js';

export { LOGOS, type LogoDef };

/** Logos rendered as a solid silhouette (no inner detail lines). None by default: details stay visible. */
const SOLID_LOGOS = new Set<string>();

/**
 * Every logo keeps its exact shape and a crisp edge line, but the soft glow radiates only from the
 * OUTER envelope. `closeGaps` (texture pixels, 1024 grid) seals gaps and notches narrower than twice
 * the value so no plasma lands in or around empty space inside the logo. Enclosed holes are always
 * sealed. 0 only seals enclosed holes.
 */
const CLOSE_GAPS: Record<string, number> = {
  'windows-10': 16,
  'windows-11': 16,
  ubuntu: 34,
  'arch-prism': 150,
  kali: 8,
  'debian-swirl': 24,
  'linux-mint': 22,
  'pop-os': 22,
  'void-linux': 30,
  endeavouros: 30,
  centos: 24,
  gentoo: 12,
  manjaro: 12,
  zorin: 14,
};
const DEFAULT_CLOSE_GAPS = 14;

/** Shared prism palettes appended after each logo's signature palette (click cycles through). */
const SHARED_PALETTES: string[][] = [
  ['#ffffff', '#e2e8f0', '#ffffff', '#cbd5e1'],
  ['#ff1e56', '#a855f7', '#0070f3', '#00dfd8', '#10b981'],
  ['#fbbf24', '#f59e0b', '#d97706', '#ef4444'],
  ['#c084fc', '#a855f7', '#7c3aed', '#ec4899'],
];

/**
 * Builds a wallpaper scene for a logo. Every logo goes through the same data-driven path:
 * svg-path shape -> exact vector SDF -> surface-flow prism edge.
 */
export function createLogoScene(def: LogoDef): Scene {
  return parseScene({
    schemaVersion: 1,
    meta: {
      id: def.id,
      name: def.name,
      author: 'Halorim Team',
      license: 'CC0-1.0',
      tags: [...def.tags],
      description: `${def.description} Unofficial fan artwork; the logo is a trademark of its owner.`,
    },
    background: { color: '#000000', haze: { intensity: 0.0 } },
    shape: {
      type: 'svg-path',
      d: def.d,
      viewBox: [0, 0, 100, 100],
      fillHoles: SOLID_LOGOS.has(def.id),
      closeGaps: CLOSE_GAPS[def.id] ?? DEFAULT_CLOSE_GAPS,
      position: [0.5, 0.52],
      scale: 0.34,
      rotation: 0,
    },
    fill: { color: '#000000', content: null },
    edge: {
      width: 0.0045,
      falloff: 0.045,
      intensity: 1.45,
      dispersion: 0.38,
      colorFlow: 'surface',
    },
    palettes: [[...def.palette], ...SHARED_PALETTES],
    mode: { id: 'rotate', params: { speed: 0.05 } },
    modifiers: [],
    interaction: {
      followCursor: true,
      sharpness: 3.5,
      smoothing: 0.04,
      idleOrbit: false,
      idleTimeoutMs: 1500,
    },
    onClick: {
      object: [{ action: 'next-palette' }],
      background: [{ action: 'next-palette' }],
    },
    performance: { fpsCap: 60, resolutionScale: 1.0 },
  });
}

export const LOGO_SCENES: Record<string, Scene> = Object.fromEntries(
  LOGOS.map((def) => [def.id, createLogoScene(def)]),
);

export const LOGO_IDS: readonly string[] = LOGOS.map((l) => l.id);
