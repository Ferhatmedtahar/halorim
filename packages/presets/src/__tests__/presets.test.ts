import { describe, it, expect } from 'vitest';
import {
  triangleScene,
  tuxScene,
  fourPaneScene,
  hexagonScene,
  starScene,
  circleScene,
  PRESET_SCENES,
  getPreset,
  ALL_PRESET_IDS,
} from '../index.js';
import { parseScene } from '@glowframe/schema';

describe('@glowframe/presets', () => {
  it('exports at least 6 valid, parseable preset scenes', () => {
    expect(ALL_PRESET_IDS.length).toBeGreaterThanOrEqual(6);
    expect(parseScene(triangleScene)).toBeDefined();
    expect(parseScene(tuxScene)).toBeDefined();
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
