import type { Scene } from '@glowframe/schema';
import { triangleScene } from './triangle.js';
import { tuxScene, TUX_SVG_PATH } from './tux.js';
import { fourPaneScene, FOUR_PANE_SVG_PATH } from './four-pane.js';
import { hexagonScene } from './hexagon.js';
import { starScene } from './star.js';
import { circleScene } from './circle.js';

export {
  triangleScene,
  tuxScene,
  fourPaneScene,
  hexagonScene,
  starScene,
  circleScene,
  TUX_SVG_PATH,
  FOUR_PANE_SVG_PATH,
};

export const PRESET_SCENES: Record<string, Scene> = {
  'triangle-prism': triangleScene,
  'tux-prism': tuxScene,
  'four-pane': fourPaneScene,
  'hexagon-prism': hexagonScene,
  'cyber-star': starScene,
  'matrix-circle': circleScene,
};

export const ALL_PRESET_IDS: readonly string[] = [
  'triangle-prism',
  'tux-prism',
  'four-pane',
  'hexagon-prism',
  'cyber-star',
  'matrix-circle',
];

export function getPreset(id: string): Scene | undefined {
  return PRESET_SCENES[id];
}
