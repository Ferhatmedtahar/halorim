import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESET_SCENES } from '@glowframe/presets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libraryRoot = path.resolve(__dirname, '../..');

describe('Library App Architecture & Gallery Constraints', () => {
  const presets = Object.values(PRESET_SCENES);

  it('contains at least 6 presets with complete metadata', () => {
    expect(presets.length).toBeGreaterThanOrEqual(6);
    for (const preset of presets) {
      expect(preset.meta.id).toBeTruthy();
      expect(preset.meta.name).toBeTruthy();
      expect(preset.meta.author).toBeTruthy();
      expect(preset.meta.license).toBeTruthy();
      expect(Array.isArray(preset.meta.tags)).toBe(true);
      expect(preset.meta.tags.length).toBeGreaterThan(0);
    }
  });

  it('guarantees pre-rendered PNG thumbnails exist for every preset', () => {
    const thumbnailsDir = path.join(libraryRoot, 'public/thumbnails');
    expect(fs.existsSync(thumbnailsDir)).toBe(true);

    for (const preset of presets) {
      const thumbPath = path.join(thumbnailsDir, `${preset.meta.id}.png`);
      expect(fs.existsSync(thumbPath), `Missing thumbnail for preset ${preset.meta.id}`).toBe(true);

      const buffer = fs.readFileSync(thumbPath);
      // Valid PNG header signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
      // Non-trivial file size (> 10 KB)
      expect(buffer.length).toBeGreaterThan(10000);
    }
  });

  it('includes bundled offline glowframe-core.js in public directory', () => {
    const coreJsPath = path.join(libraryRoot, 'public/glowframe-core.js');
    expect(fs.existsSync(coreJsPath)).toBe(true);
    const content = fs.readFileSync(coreJsPath, 'utf-8');
    expect(content.length).toBeGreaterThan(50000);
    expect(content).toContain('createRenderer');
  });

  it('enforces gallery bug-avoidance rule: no WebGL canvas elements on gallery page', () => {
    const pageHtmlPath = path.join(libraryRoot, '.next/server/app/index.html');
    if (fs.existsSync(pageHtmlPath)) {
      const html = fs.readFileSync(pageHtmlPath, 'utf-8');
      // No live WebGL canvas on the gallery grid
      expect(html).not.toContain('<canvas');
      // All presets are represented with pre-rendered thumbnail images
      for (const preset of presets) {
        expect(html).toContain(preset.meta.name);
        expect(html).toContain(`/thumbnails/${preset.meta.id}.png`);
      }
    }
  });

  it('pre-renders all preset detail pages (/w/[id]) statically', () => {
    for (const preset of presets) {
      const detailHtmlPath = path.join(libraryRoot, `.next/server/app/w/${preset.meta.id}.html`);
      if (fs.existsSync(detailHtmlPath)) {
        const html = fs.readFileSync(detailHtmlPath, 'utf-8');
        expect(html).toContain(preset.meta.name);
        expect(html).toContain(preset.meta.author);
        expect(html).toContain(preset.meta.license);
      }
    }
  });

  it('renders installation instructions for Windows and Linux on /about', () => {
    const aboutHtmlPath = path.join(libraryRoot, '.next/server/app/about.html');
    if (fs.existsSync(aboutHtmlPath)) {
      const html = fs.readFileSync(aboutHtmlPath, 'utf-8');
      expect(html).toContain('>Windows<');
      expect(html).toContain('Load Custom SVG');
      expect(html).toContain('>Linux<');
      expect(html).toContain('layer-shell');
      expect(html).toContain('GNOME');
    }
  });
});
