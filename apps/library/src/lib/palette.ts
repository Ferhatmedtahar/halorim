import type { Scene } from '@glowframe/schema';

/** First two stops of a scene's primary palette, used to tint hover glows. */
export function glowStops(scene: Scene): [string, string] {
  const p = scene.palettes[0] ?? [];
  const a = p[0] ?? '#e8e8e8';
  return [a, p[1] ?? a];
}
