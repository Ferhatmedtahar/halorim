import type { Scene } from '@glowframe/schema';
import { triangleScene } from './triangle.js';
import { infinityScene, INFINITY_SVG_PATH } from './infinity.js';
import { phantomScene, PHANTOM_SVG_PATH } from './phantom.js';
import { LOGOS, LOGO_SCENES, LOGO_IDS, createLogoScene, type LogoDef } from './logos.js';

export {
  triangleScene,
  infinityScene,
  phantomScene,
  INFINITY_SVG_PATH,
  PHANTOM_SVG_PATH,
  LOGOS,
  LOGO_SCENES,
  LOGO_IDS,
  createLogoScene,
  type LogoDef,
};

export const PRESET_SCENES: Record<string, Scene> = {
  'triangle-prism': triangleScene,
  ...LOGO_SCENES,
  'infinity-loop': infinityScene,
  'retro-ghost': phantomScene,
};

/** Display order: the triangle first, then popular OS logos, then the generic shapes. */
export const ALL_PRESET_IDS: readonly string[] = [
  'triangle-prism',
  ...LOGO_IDS,
  'infinity-loop',
  'retro-ghost',
];

export function getPreset(id: string): Scene | undefined {
  return PRESET_SCENES[id];
}
