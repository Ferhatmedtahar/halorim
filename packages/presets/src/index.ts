import type { Scene } from '@glowframe/schema';
import { triangleScene } from './triangle.js';
import { tuxScene, TUX_SVG_PATH } from './tux.js';
import { fourPaneScene, FOUR_PANE_SVG_PATH } from './four-pane.js';
import { hexagonScene } from './hexagon.js';
import { starScene } from './star.js';
import { circleScene } from './circle.js';
import { archScene, ARCH_SVG_PATH } from './arch.js';
import { infinityScene, INFINITY_SVG_PATH } from './infinity.js';
import { diamondScene, DIAMOND_SVG_PATH } from './diamond.js';
import { hypercubeScene, HYPERCUBE_SVG_PATH } from './hypercube.js';
import { phantomScene, PHANTOM_SVG_PATH } from './phantom.js';
import { debianScene, DEBIAN_SVG_PATH } from './debian.js';

export {
  triangleScene,
  tuxScene,
  fourPaneScene,
  hexagonScene,
  starScene,
  circleScene,
  archScene,
  infinityScene,
  diamondScene,
  hypercubeScene,
  phantomScene,
  debianScene,
  TUX_SVG_PATH,
  FOUR_PANE_SVG_PATH,
  ARCH_SVG_PATH,
  INFINITY_SVG_PATH,
  DIAMOND_SVG_PATH,
  HYPERCUBE_SVG_PATH,
  PHANTOM_SVG_PATH,
  DEBIAN_SVG_PATH,
};

export const PRESET_SCENES: Record<string, Scene> = {
  'triangle-prism': triangleScene,
  'tux-prism': tuxScene,
  'four-pane': fourPaneScene,
  'hexagon-prism': hexagonScene,
  'cyber-star': starScene,
  'matrix-circle': circleScene,
  'arch-prism': archScene,
  'infinity-loop': infinityScene,
  'diamond-prism': diamondScene,
  'hypercube': hypercubeScene,
  'retro-ghost': phantomScene,
  'debian-swirl': debianScene,
};

export const ALL_PRESET_IDS: readonly string[] = [
  'triangle-prism',
  'tux-prism',
  'arch-prism',
  'debian-swirl',
  'infinity-loop',
  'diamond-prism',
  'hypercube',
  'retro-ghost',
  'four-pane',
  'hexagon-prism',
  'cyber-star',
  'matrix-circle',
];

export function getPreset(id: string): Scene | undefined {
  return PRESET_SCENES[id];
}
