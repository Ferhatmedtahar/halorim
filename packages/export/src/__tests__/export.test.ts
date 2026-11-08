import { describe, it, expect } from 'vitest';
import {
  exportSceneJson,
  exportHtmlPack,
  generateStandaloneHtml,
  PRESET_RESOLUTIONS,
} from '../index.js';
import { exampleScene } from '@glowframe/schema';
import { unzipSync, strFromU8 } from 'fflate';

describe('@glowframe/export', () => {
  it('serializes scene to formatted JSON', () => {
    const jsonStr = exportSceneJson(exampleScene);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.meta.id).toBe(exampleScene.meta.id);
  });

  it('generates standalone HTML containing embedded scene and canvas', () => {
    const html = generateStandaloneHtml(exampleScene);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<canvas id="wallpaper-canvas">');
    expect(html).toContain('glowframe-scene');
    expect(html).toContain(exampleScene.meta.name);
  });

  it('creates an offline ZIP archive with index.html, scene.json, and README.txt', async () => {
    const zipBytes = await exportHtmlPack({
      scene: exampleScene,
      bundledCoreJs: '// bundled core js mock',
    });

    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(100);

    // Verify unzipping
    const unzipped = unzipSync(zipBytes);
    expect(unzipped['index.html']).toBeDefined();
    expect(unzipped['scene.json']).toBeDefined();
    expect(unzipped['README.txt']).toBeDefined();
    expect(unzipped['glowframe-core.js']).toBeDefined();

    const readmeText = strFromU8(unzipped['README.txt']!);
    expect(readmeText).toContain('Glowframe Interactive Wallpaper Pack');
    expect(readmeText).toContain('Lively Wallpaper');

    const sceneJson = JSON.parse(strFromU8(unzipped['scene.json']!));
    expect(sceneJson.schemaVersion).toBe(1);
  });

  it('defines standard export resolutions including 4K', () => {
    expect(PRESET_RESOLUTIONS.FHD.width).toBe(1920);
    expect(PRESET_RESOLUTIONS.FHD.height).toBe(1080);
    expect(PRESET_RESOLUTIONS.QHD.width).toBe(2560);
    expect(PRESET_RESOLUTIONS.QHD.height).toBe(1440);
    expect(PRESET_RESOLUTIONS.UHD_4K.width).toBe(3840);
    expect(PRESET_RESOLUTIONS.UHD_4K.height).toBe(2160);
  });
});
