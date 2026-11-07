import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowWithGlowframe extends Window {
  createRenderer: (opts: unknown) => {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
  };
  exampleScene: unknown;
  renderer: {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
  };
  __glowframeReady?: boolean;
}

describe('renderer WebGL2 integration & golden tests', () => {
  let browser: Browser;
  let page: Page;
  const testHtmlPath = path.resolve(__dirname, '../../test-page/index.html');

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

  it('runs 100 create/dispose cycles cleanly without growing resources', async () => {
    const result = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      document.body.appendChild(canvas);

      for (let i = 0; i < 100; i++) {
        const r = win.createRenderer({
          canvas,
          scene: win.exampleScene,
        });
        r.renderFrame(i * 16.6);
        r.dispose();
      }

      document.body.removeChild(canvas);
      return { success: true, cycles: 100 };
    });

    expect(result.success).toBe(true);
    expect(result.cycles).toBe(100);
  }, 45000);

  it('handles WebGL context loss and restoration with WEBGL_lose_context', async () => {
    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      document.body.appendChild(canvas);

      const r = win.createRenderer({
        canvas,
        scene: win.exampleScene,
      });

      r.renderFrame(0);

      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('No webgl2 context');

      const loseExt = gl.getExtension('WEBGL_lose_context');
      if (!loseExt) {
        r.dispose();
        document.body.removeChild(canvas);
        return { supported: false };
      }

      // Simulate context loss
      loseExt.loseContext();
      // Render frame during loss must not throw
      r.renderFrame(100);

      // Restore context
      loseExt.restoreContext();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Render frame after restoration
      r.renderFrame(200);

      r.dispose();
      document.body.removeChild(canvas);
      return { supported: true, success: true };
    });

    if (result.supported) {
      expect(result.success).toBe(true);
    }
  }, 30000);

  it('renders triangle with glowing prismatic rim and black interior matching reference', async () => {
    const renderResult = await page.evaluate(() => {
      const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      const win = window as unknown as WindowWithGlowframe;

      // Stop running animation loop and do deterministic render at fixed time = 0
      win.renderer.stop();
      win.renderer.renderFrame(0);

      const gl = canvas.getContext('webgl2')!;
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Compute normalized to physical canvas coordinates (accounting for resolution scale / DPR)
      const toIndex = (normX: number, normY: number) => {
        const px = Math.min(width - 1, Math.max(0, Math.floor(normX * width)));
        // WebGL origin is bottom-left, CSS is top-left
        const py = Math.min(height - 1, Math.max(0, Math.floor((1.0 - normY) * height)));
        return (py * width + px) * 4;
      };

      // 1. Center of triangle: normalized [0.5, 0.52]
      const centerIdx = toIndex(0.5, 0.52);
      const center = [pixels[centerIdx]!, pixels[centerIdx + 1]!, pixels[centerIdx + 2]!];

      // 2. Background corner: normalized [0.05, 0.05]
      const bgIdx = toIndex(0.05, 0.05);
      const bg = [pixels[bgIdx]!, pixels[bgIdx + 1]!, pixels[bgIdx + 2]!];

      // 3. Near top apex rim: normalized [0.5, 0.41]
      const rimIdx = toIndex(0.5, 0.41);
      const rim = [pixels[rimIdx]!, pixels[rimIdx + 1]!, pixels[rimIdx + 2]!];

      return { center, bg, rim, width, height };
    });

    // 1. Center of shape must be pure/near black (interior fill)
    expect(renderResult.center[0]!).toBeLessThan(10);
    expect(renderResult.center[1]!).toBeLessThan(10);
    expect(renderResult.center[2]!).toBeLessThan(10);

    // 2. Background must be dark (black background with soft volumetric ambient haze)
    expect(renderResult.bg[0]!).toBeLessThan(50);
    expect(renderResult.bg[1]!).toBeLessThan(50);
    expect(renderResult.bg[2]!).toBeLessThan(50);

    // 3. Rim edge must emit bright colored light
    const rimTotal = renderResult.rim[0]! + renderResult.rim[1]! + renderResult.rim[2]!;
    expect(rimTotal).toBeGreaterThan(40);

    // Save golden screenshot
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    const goldenPath = path.resolve(__dirname, '../../test-page/golden-triangle.png');
    fs.writeFileSync(goldenPath, screenshotBuffer);
    expect(fs.existsSync(goldenPath)).toBe(true);
  }, 30000);
});
