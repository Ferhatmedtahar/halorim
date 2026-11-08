import { describe, it, expect } from 'vitest';
import {
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
  PRESET_SCENES,
  getPreset,
  ALL_PRESET_IDS,
} from '../index.js';
import { parseScene } from '@glowframe/schema';

describe('@glowframe/presets', () => {
  it('exports at least 10 valid, parseable preset scenes', () => {
    expect(ALL_PRESET_IDS.length).toBeGreaterThanOrEqual(10);
    expect(ALL_PRESET_IDS.length).toBe(12);

    expect(parseScene(triangleScene)).toBeDefined();
    expect(parseScene(tuxScene)).toBeDefined();
    expect(parseScene(archScene)).toBeDefined();
    expect(parseScene(debianScene)).toBeDefined();
    expect(parseScene(infinityScene)).toBeDefined();
    expect(parseScene(diamondScene)).toBeDefined();
    expect(parseScene(hypercubeScene)).toBeDefined();
    expect(parseScene(phantomScene)).toBeDefined();
    expect(parseScene(fourPaneScene)).toBeDefined();
    expect(parseScene(hexagonScene)).toBeDefined();
    expect(parseScene(starScene)).toBeDefined();
    expect(parseScene(circleScene)).toBeDefined();
  });

  it('correctly maps all presets in the PRESET_SCENES registry', () => {
    for (const id of ALL_PRESET_IDS) {
      expect(PRESET_SCENES[id]).toBeDefined();
      expect(getPreset(id)).toBe(PRESET_SCENES[id]);
      expect(PRESET_SCENES[id]?.meta.id).toBe(id);
    }
  });
});
