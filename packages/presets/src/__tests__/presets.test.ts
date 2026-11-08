import { describe, it, expect } from 'vitest';
import {
  triangleScene,
  tuxScene,
  fourPaneScene,
  PRESET_SCENES,
  getPreset,
  ALL_PRESET_IDS,
} from '../index.js';
import { parseScene } from '@glowframe/schema';

describe('@glowframe/presets', () => {
  it('exports valid, parseable preset scenes', () => {
    expect(parseScene(triangleScene)).toBeDefined();
    expect(parseScene(tuxScene)).toBeDefined();
    expect(parseScene(fourPaneScene)).toBeDefined();
  });

  it('correctly maps all presets in the PRESET_SCENES registry', () => {
    expect(ALL_PRESET_IDS).toEqual(['triangle-prism', 'tux-prism', 'four-pane']);
    for (const id of ALL_PRESET_IDS) {
      expect(PRESET_SCENES[id]).toBeDefined();
      expect(getPreset(id)).toBe(PRESET_SCENES[id]);
      expect(PRESET_SCENES[id]?.meta.id).toBe(id);
    }
  });

  it('configures Tux shape as an svg-path with valid viewBox', () => {
    expect(tuxScene.shape.type).toBe('svg-path');
    if (tuxScene.shape.type === 'svg-path') {
      expect(tuxScene.shape.d.startsWith('M')).toBe(true);
      expect(tuxScene.shape.viewBox).toEqual([0, 0, 100, 100]);
    }
  });

  it('configures Four-Pane shape as an svg-path with valid viewBox', () => {
    expect(fourPaneScene.shape.type).toBe('svg-path');
    if (fourPaneScene.shape.type === 'svg-path') {
      expect(fourPaneScene.shape.d.startsWith('M')).toBe(true);
      expect(fourPaneScene.shape.viewBox).toEqual([0, 0, 100, 100]);
    }
  });
});
