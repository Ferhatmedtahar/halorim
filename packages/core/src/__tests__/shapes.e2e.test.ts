import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import { expectMatchesGolden } from './golden';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TUX_SVG_PATH =
  'M 50 12 ' +
  'C 62 12 66 22 66 30 ' +
  'C 66 33 72 36 70 39 ' +
  'C 68 41 64 40 62 40 ' +
  'C 64 45 78 52 85 64 ' +
  'C 88 70 84 75 79 73 ' +
  'C 74 71 71 63 68 58 ' +
  'C 69 68 72 78 68 84 ' +
  'C 74 85 82 89 78 93 ' +
  'C 74 96 62 94 57 88 ' +
  'C 53 87 51 87 49 87 ' +
  'C 47 87 43 88 38 93 ' +
  'C 34 96 22 96 26 89 ' +
  'C 28 85 34 85 32 84 ' +
  'C 28 78 31 68 32 58 ' +
  'C 29 63 26 71 21 73 ' +
  'C 16 75 12 70 15 64 ' +
  'C 22 52 36 45 38 40 ' +
  'C 36 40 32 41 30 39 ' +
  'C 28 36 34 33 34 30 ' +
  'C 34 22 38 12 50 12 Z';

const FOUR_PANE_SVG_PATH =
  'M 16 14 H 46 C 47.5 14 48 14.5 48 16 V 46 C 48 47.5 47.5 48 46 48 H 16 C 14.5 48 14 47.5 14 46 V 16 C 14 14.5 14.5 14 16 14 Z ' +
  'M 54 14 H 84 C 85.5 14 86 14.5 86 16 V 46 C 86 47.5 85.5 48 84 48 H 54 C 52.5 48 52 47.5 52 46 V 16 C 52 14.5 52.5 14 54 14 Z ' +
  'M 16 52 H 46 C 47.5 52 48 52.5 48 54 V 84 C 48 85.5 47.5 86 46 86 H 16 C 14.5 86 14 85.5 14 84 V 54 C 14 52.5 14.5 52 16 52 Z ' +
  'M 54 52 H 84 C 85.5 52 86 52.5 86 54 V 84 C 86 85.5 85.5 86 84 86 H 54 C 52.5 86 52 85.5 52 84 V 54 C 52 52.5 52.5 52 54 52 Z';

interface WindowWithGlowframe extends Window {
  createRenderer: (opts: unknown) => {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
    setScene: (scene: unknown) => void;
    handleClick: (x: number, y: number) => 'object' | 'background';
    getActivePaletteIndex: () => number;
    triggerAction: (actionId: string, params?: unknown) => void;
    isContentVisible: () => boolean;
  };
  renderer: {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
    setScene: (scene: unknown) => void;
    handleClick: (x: number, y: number) => 'object' | 'background';
    getActivePaletteIndex: () => number;
    triggerAction: (actionId: string, params?: unknown) => void;
    isContentVisible: () => boolean;
  };
  exampleScene: Record<string, unknown>;
  ManualClock: new (initMs?: number) => {
    now: () => number;
    set: (t: number) => void;
  };
  __glowframeReady?: boolean;
}

describe('M6: Arbitrary Shapes, Center Content, and Presets', () => {
  let browser: Browser;
  let page: Page;
  const testHtmlPath = path.resolve(__dirname, '../../test-page/index.html');
  const testPageDir = path.resolve(__dirname, '../../test-page');

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--allow-file-access-from-files',
      ],
    });
    page = await browser.newPage({
      viewport: { width: 800, height: 600 },
      deviceScaleFactor: 1,
    });
    await page.goto(`file://${testHtmlPath}`);
    await page.waitForFunction(
      () => (window as unknown as WindowWithGlowframe).__glowframeReady === true,
    );
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('renders Tux preset with reference glow aesthetic and pure black interior', async () => {
    const tuxSceneConfig = {
      schemaVersion: 1,
      meta: {
        id: 'tux-prism',
        name: 'Tux Linux Mascot',
        author: 'Glowframe Team',
        license: 'CC0-1.0',
        tags: ['linux', 'tux'],
      },
      background: { color: '#000000', haze: { intensity: 0.6 } },
      shape: {
        type: 'svg-path',
        d: TUX_SVG_PATH,
        viewBox: [0, 0, 100, 100],
        position: [0.5, 0.52],
        scale: 0.32,
        rotation: 0,
      },
      fill: { color: '#000000', content: null },
      edge: { width: 0.004, falloff: 0.08, intensity: 1.1, dispersion: 0.35 },
      palettes: [
        ['oklch(0.8 0.18 130)', 'oklch(0.75 0.22 85)', 'oklch(0.7 0.2 35)', 'oklch(0.65 0.18 200)'],
      ],
      mode: { id: 'glow', params: {} },
      modifiers: [],
      interaction: {
        followCursor: true,
        sharpness: 3.2,
        smoothing: 0.12,
        idleOrbit: true,
      },
      onClick: {
        object: [{ action: 'next-palette' }, { action: 'ripple' }],
        background: [{ action: 'none' }],
      },
      performance: { fpsCap: 30, resolutionScale: 0.5 },
    };

    const result = await page.evaluate((scene) => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;

      win.renderer.stop();
      win.renderer.setScene(scene);
      win.renderer.renderFrame(1000);

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const samplePoint = (normX: number, normY: number): [number, number, number, number] => {
        const px = Math.floor(normX * (width - 1));
        const py = Math.floor((1 - normY) * (height - 1));
        const idx = (py * width + px) * 4;
        return [pixels[idx]!, pixels[idx + 1]!, pixels[idx + 2]!, pixels[idx + 3]!];
      };

      // Interior belly center is pure black
      const interior = samplePoint(0.5, 0.52);
      // Top of head rim has vibrant prism glow
      const rim = samplePoint(0.5, 0.37);

      return {
        glError: gl.getError(),
        interior,
        rimLuminance: rim[0] + rim[1] + rim[2],
      };
    }, tuxSceneConfig);

    expect(result.glError).toBe(0);
    expect(result.interior[0]).toBe(0);
    expect(result.interior[1]).toBe(0);
    expect(result.interior[2]).toBe(0);
    expect(result.rimLuminance).toBeGreaterThan(40);

    // Save golden screenshot
    const canvasHandle = await page.$('#wallpaper-canvas');
    expect(canvasHandle).not.toBeNull();
    const goldenPath = path.join(testPageDir, 'golden-tux.png');
    const screenshot = await canvasHandle!.screenshot();
    expectMatchesGolden(screenshot, goldenPath);
  });

  it('verifies click hit-testing works accurately on Tux silhouette', async () => {
    const hitResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;

      // Inside Tux belly/chest
      const centerHit = win.renderer.handleClick(0.5, 0.52);
      // Top corner far outside Tux
      const cornerHit = win.renderer.handleClick(0.1, 0.1);
      // Far right outside flipper
      const outsideRightHit = win.renderer.handleClick(0.85, 0.52);

      return { centerHit, cornerHit, outsideRightHit };
    });

    expect(hitResult.centerHit).toBe('object');
    expect(hitResult.cornerHit).toBe('background');
    expect(hitResult.outsideRightHit).toBe('background');
  });

  it('renders generic four-pane preset with dividing cross', async () => {
    const fourPaneConfig = {
      schemaVersion: 1,
      meta: {
        id: 'four-pane',
        name: 'Generic Four-Pane Window',
        author: 'Glowframe Team',
        license: 'CC0-1.0',
        tags: ['windows'],
      },
      background: { color: '#000000', haze: { intensity: 0.65 } },
      shape: {
        type: 'svg-path',
        d: FOUR_PANE_SVG_PATH,
        viewBox: [0, 0, 100, 100],
        position: [0.5, 0.5],
        scale: 0.3,
        rotation: 0,
      },
      fill: { color: '#000000', content: null },
      edge: { width: 0.0035, falloff: 0.085, intensity: 1.05, dispersion: 0.35 },
      palettes: [
        [
          'oklch(0.7 0.18 220)',
          'oklch(0.75 0.2 260)',
          'oklch(0.8 0.19 190)',
          'oklch(0.7 0.22 300)',
        ],
      ],
      mode: { id: 'glow', params: {} },
      modifiers: [],
      interaction: {
        followCursor: true,
        sharpness: 3.0,
        smoothing: 0.12,
        idleOrbit: true,
      },
      onClick: {
        object: [{ action: 'next-palette' }],
        background: [{ action: 'none' }],
      },
      performance: { fpsCap: 30, resolutionScale: 0.5 },
    };

    const result = await page.evaluate((scene) => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;

      win.renderer.setScene(scene);
      win.renderer.renderFrame(1000);

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const samplePoint = (normX: number, normY: number): [number, number, number, number] => {
        const px = Math.floor(normX * (width - 1));
        const py = Math.floor((1 - normY) * (height - 1));
        const idx = (py * width + px) * 4;
        return [pixels[idx]!, pixels[idx + 1]!, pixels[idx + 2]!, pixels[idx + 3]!];
      };

      // Inside top-left pane (around normX=0.45, normY=0.45)
      const insidePane = samplePoint(0.46, 0.46);

      return {
        glError: gl.getError(),
        insidePane,
      };
    }, fourPaneConfig);

    expect(result.glError).toBe(0);
    expect(result.insidePane[0]).toBe(0);
    expect(result.insidePane[1]).toBe(0);
    expect(result.insidePane[2]).toBe(0);

    // Save golden screenshot
    const canvasHandle = await page.$('#wallpaper-canvas');
    expect(canvasHandle).not.toBeNull();
    const goldenPath = path.join(testPageDir, 'golden-four-pane.png');
    const screenshot = await canvasHandle!.screenshot();
    expectMatchesGolden(screenshot, goldenPath);
  });

  it('renders center content layer inside silhouette and toggles visibility cleanly', async () => {
    const sceneWithContent = {
      schemaVersion: 1,
      meta: {
        id: 'triangle-with-content',
        name: 'Triangle Content Test',
        author: 'Glowframe Team',
        license: 'CC0-1.0',
        tags: ['test'],
      },
      background: { color: '#000000', haze: { intensity: 0.6 } },
      shape: {
        type: 'preset',
        preset: 'triangle',
        position: [0.5, 0.52],
        scale: 0.35,
        rotation: 0,
      },
      fill: {
        color: '#000000',
        content: {
          type: 'text',
          text: 'GLOW',
          fontFamily: 'sans-serif',
          tint: '#00ff88',
          scale: 0.6,
          opacity: 1.0,
        },
      },
      edge: { width: 0.004, falloff: 0.09, intensity: 1.0, dispersion: 0.35 },
      palettes: [['oklch(0.75 0.2 350)', 'oklch(0.7 0.2 290)', 'oklch(0.8 0.2 150)']],
      mode: { id: 'glow', params: {} },
      modifiers: [],
      interaction: { followCursor: false, sharpness: 3.0, smoothing: 0.12, idleOrbit: false },
      onClick: { object: [], background: [] },
      performance: { fpsCap: 30, resolutionScale: 0.5 },
    };

    const contentResult = await page.evaluate((scene) => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;

      win.renderer.setScene(scene);
      win.renderer.renderFrame(1000);

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const sampleCenterBox = (): number => {
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let maxLum = 0;
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const px = Math.floor(0.5 * (width - 1)) + dx;
            const py = Math.floor(0.5 * (height - 1)) + dy;
            const idx = (py * width + px) * 4;
            const lum = pixels[idx]! + pixels[idx + 1]! + pixels[idx + 2]!;
            if (lum > maxLum) maxLum = lum;
          }
        }
        return maxLum;
      };

      const contentLuminanceWithText = sampleCenterBox();

      // Toggle content off
      win.renderer.triggerAction('toggle-content');
      win.renderer.renderFrame(1000);

      const contentLuminanceWhenHidden = sampleCenterBox();

      return {
        contentLuminanceWithText,
        contentLuminanceWhenHidden,
        isVisible: win.renderer.isContentVisible(),
      };
    }, sceneWithContent);

    expect(contentResult.contentLuminanceWithText).toBeGreaterThan(30);
    expect(contentResult.contentLuminanceWhenHidden).toBe(0);
    expect(contentResult.isVisible).toBe(false);
  });

  it('fails gracefully with an error on bad SVGs and never produces a blank screen', async () => {
    const badSvgScene = {
      schemaVersion: 1,
      meta: {
        id: 'bad-svg',
        name: 'Bad SVG Test',
        author: 'Tester',
        license: 'CC0-1.0',
        tags: [],
      },
      background: { color: '#000000', haze: { intensity: 0.6 } },
      shape: {
        type: 'svg-file',
        asset: '<svg><circle></svg>', // malformed / no path d
        position: [0.5, 0.5],
        scale: 0.3,
        rotation: 0,
      },
      fill: { color: '#000000', content: null },
      edge: { width: 0.004, falloff: 0.09, intensity: 1.0, dispersion: 0.35 },
      palettes: [['oklch(0.8 0.2 150)', 'oklch(0.7 0.2 290)']],
      mode: { id: 'glow', params: {} },
      modifiers: [],
      interaction: { followCursor: false, sharpness: 3.0, smoothing: 0.12, idleOrbit: false },
      onClick: { object: [], background: [] },
      performance: { fpsCap: 30, resolutionScale: 0.5 },
    };

    const recoveryResult = await page.evaluate((badScene) => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;

      // First ensure a valid scene is rendering
      win.renderer.setScene(win.exampleScene);
      win.renderer.renderFrame(1000);

      let threwError = false;
      let errorMessage = '';

      try {
        win.renderer.setScene(badScene);
      } catch (err) {
        threwError = true;
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      // After the error, render again: canvas must not be blank and WebGL must be healthy
      win.renderer.renderFrame(1000);
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Verify outer rim still contains glowing pixels
      let hasGlow = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i]! > 30 || pixels[i + 1]! > 30 || pixels[i + 2]! > 30) {
          hasGlow = true;
          break;
        }
      }

      return {
        threwError,
        errorMessage,
        glError: gl.getError(),
        hasGlow,
      };
    }, badSvgScene);

    expect(recoveryResult.threwError).toBe(true);
    expect(recoveryResult.errorMessage.length).toBeGreaterThan(0);
    expect(recoveryResult.glError).toBe(0);
    expect(recoveryResult.hasGlow).toBe(true);
  });
});
