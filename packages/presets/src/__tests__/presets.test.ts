import { describe, it, expect } from 'vitest';
import {
  triangleScene,
  infinityScene,
  phantomScene,
  PRESET_SCENES,
  getPreset,
  ALL_PRESET_IDS,
  LOGOS,
  LOGO_SCENES,
} from '../index.js';
import { parseScene } from '@glowframe/schema';

describe('@glowframe/presets', () => {
  it('exports the triangle, popular OS logos and generic shapes as valid scenes', () => {
    expect(ALL_PRESET_IDS.length).toBeGreaterThanOrEqual(30);

    for (const scene of [
      triangleScene,
      infinityScene,
      phantomScene,
                    ]) {
      expect(parseScene(scene)).toBeDefined();
    }
  });

  it('ships the popular operating system logos', () => {
    const ids = LOGOS.map((l) => l.id);
    for (const required of [
      'windows-10',
      'windows-11',
      'macos-apple',
      'ubuntu',
      'tux-prism',
      'arch-prism',
      'kali',
      'debian-swirl',
      'fedora',
    ]) {
      expect(ids).toContain(required);
    }
  });

  it('uses surface color flow for every logo so the prism follows the shape', () => {
    for (const scene of Object.values(LOGO_SCENES)) {
      expect(scene.edge.colorFlow).toBe('surface');
      expect(scene.shape.type).toBe('svg-path');
    }
    expect(triangleScene.edge.colorFlow).toBe('radial');
  });

  it('has unique ids and a registry entry for every preset', () => {
    expect(new Set(ALL_PRESET_IDS).size).toBe(ALL_PRESET_IDS.length);
    for (const id of ALL_PRESET_IDS) {
      expect(PRESET_SCENES[id]).toBeDefined();
      expect(getPreset(id)).toBe(PRESET_SCENES[id]);
      expect(PRESET_SCENES[id]?.meta.id).toBe(id);
    }
  });
});
