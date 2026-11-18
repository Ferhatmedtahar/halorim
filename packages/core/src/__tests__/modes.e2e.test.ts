import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import { expectMatchesGolden } from './golden';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowWithGlowframe extends Window {
  createRenderer: (opts: unknown) => {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
    setMode: (id: string, params?: Record<string, unknown>) => void;
    getActiveMode: () => string;
    triggerAction: (
      actionId: string,
      params?: Record<string, unknown>,
      origin?: [number, number],
    ) => void;
  };
  renderer: {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
    setMode: (id: string, params?: Record<string, unknown>) => void;
    getActiveMode: () => string;
    triggerAction: (
      actionId: string,
      params?: Record<string, unknown>,
      origin?: [number, number],
    ) => void;
  };
  ManualClock: new (initMs?: number) => {
    now: () => number;
    set: (t: number) => void;
    advance: (dt: number) => void;
  };
  exampleScene: Record<string, unknown>;
  ALL_BASE_MODE_IDS: string[];
  __glowframeReady?: boolean;
}

describe('M5: Base Modes, Effects, and Golden Frame Screenshots', () => {
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

  const modes: Array<{ id: string; params?: Record<string, unknown> }> = [
    { id: 'glow' },
    { id: 'pulse', params: { speed: 2.0, depth: 0.35 } },
    { id: 'rotate', params: { speed: 0.25 } },
    { id: 'spectrum-cycle', params: { speed: 0.15 } },
    { id: 'flicker', params: { seed: 42, depth: 0.2, speed: 15.0 } },
    { id: 'sweep', params: { speed: 0.4, width: 0.08, intensity: 1.8 } },
    { id: 'orbit', params: { speed: 0.8, radius: 1.3 } },
  ];

  for (const mode of modes) {
    it(`renders golden frame for mode: ${mode.id} at fixed time (t=1000ms)`, async () => {
      const modeResult = await page.evaluate(
        ({ modeId, modeParams }) => {
          const win = window as unknown as WindowWithGlowframe;
          const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
          const gl = canvas.getContext('webgl2')!;

          win.renderer.stop();
          win.renderer.setMode(modeId, modeParams);
          win.renderer.renderFrame(1000);

          const glError = gl.getError();
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

          const interior = samplePoint(0.5, 0.52);
          const rim = samplePoint(0.5, 0.36);

          return {
            glError,
            interior,
            rimLuminance: rim[0] + rim[1] + rim[2],
            activeMode: win.renderer.getActiveMode(),
          };
        },
        { modeId: mode.id, modeParams: mode.params },
      );

      expect(modeResult.glError).toBe(0);
      expect(modeResult.activeMode).toBe(mode.id);
      expect(modeResult.interior[0]).toBe(0);
      expect(modeResult.interior[1]).toBe(0);
      expect(modeResult.interior[2]).toBe(0);
      expect(modeResult.rimLuminance).toBeGreaterThan(30);

      const canvasHandle = await page.$('#wallpaper-canvas');
      expect(canvasHandle).not.toBeNull();
      const goldenPath = path.join(testPageDir, `golden-mode-${mode.id}.png`);
      const screenshot = await canvasHandle!.screenshot();
      expectMatchesGolden(screenshot, goldenPath);
    });
  }

  it('switches modes 500 times at runtime without leaking resources or throwing WebGL errors', async () => {
    const stressResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;

      const modeList = win.ALL_BASE_MODE_IDS;
      for (let i = 0; i < 500; i++) {
        if (i % 2 === 0) {
          const nextMode = modeList[i % modeList.length]!;
          win.renderer.setMode(nextMode);
        } else {
          win.renderer.triggerAction('next-mode');
        }
        win.renderer.renderFrame(i * 16.6);

        const err = gl.getError();
        if (err !== gl.NO_ERROR) {
          return { success: false, iteration: i, error: err };
        }
      }

      return {
        success: true,
        finalMode: win.renderer.getActiveMode(),
        error: gl.getError(),
      };
    });

    expect(stressResult.success).toBe(true);
    expect(stressResult.error).toBe(0);
  });

  it('verifies pulse mode breathing peak vs trough in WebGL', async () => {
    const pulseResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      document.body.appendChild(canvas);

      const clock = new win.ManualClock(0);
      const r = win.createRenderer({
        canvas,
        scene: win.exampleScene,
        clock,
      });

      r.setMode('pulse', { speed: 2.0, depth: 0.4 });
      const gl = canvas.getContext('webgl2')!;
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);

      // Peak at t = 125ms
      clock.set(125);
      r.renderFrame(125);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const topIdx =
        (Math.floor((1 - 0.36) * (height - 1)) * width + Math.floor(0.5 * (width - 1))) * 4;
      const peakLuminance = pixels[topIdx]! + pixels[topIdx + 1]! + pixels[topIdx + 2]!;

      // Trough at t = 375ms
      clock.set(375);
      r.renderFrame(375);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const troughLuminance = pixels[topIdx]! + pixels[topIdx + 1]! + pixels[topIdx + 2]!;

      r.dispose();
      document.body.removeChild(canvas);

      return { peakLuminance, troughLuminance };
    });

    expect(pulseResult.peakLuminance).toBeGreaterThan(pulseResult.troughLuminance);
  }, 15000);

  it('verifies transient burst action increases glow luminance and decays in WebGL', async () => {
    const burstResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      document.body.appendChild(canvas);

      const clock = new win.ManualClock(1000);
      const r = win.createRenderer({
        canvas,
        scene: win.exampleScene,
        clock,
      });

      r.setMode('glow');
      const gl = canvas.getContext('webgl2')!;
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);

      const sampleRim = (): number => {
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const topIdx =
          (Math.floor((1 - 0.36) * (height - 1)) * width + Math.floor(0.5 * (width - 1))) * 4;
        return pixels[topIdx]! + pixels[topIdx + 1]! + pixels[topIdx + 2]!;
      };

      // Baseline glow at t=1000
      r.renderFrame(1000);
      const baseline = sampleRim();

      // Trigger burst at t=1000
      r.triggerAction('burst', { intensity: 2.0, decay: 4.0, duration: 0.5 });
      r.renderFrame(1000);
      const flash = sampleRim();

      // Advance clock past 500ms duration (t=1600)
      clock.set(1600);
      r.renderFrame(1600);
      const decayed = sampleRim();

      r.dispose();
      document.body.removeChild(canvas);

      return { baseline, flash, decayed };
    });

    expect(burstResult.flash).toBeGreaterThan(burstResult.baseline);
    expect(burstResult.decayed).toBeLessThanOrEqual(burstResult.baseline + 2);
  }, 15000);
});
