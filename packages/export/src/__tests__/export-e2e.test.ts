import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exampleScene, parseScene } from '@glowframe/schema';
import { exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '../index.js';
import { unzipSync } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Export E2E & offline acceptance tests', () => {
  let browser: Browser;
  let page: Page;
  const testHtmlPath = path.resolve(__dirname, '../../../../packages/core/test-page/index.html');
  const coreDistPath = path.resolve(__dirname, '../../../../packages/core/dist/index.js');
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glowframe-export-test-'));

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
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.goto(`file://${testHtmlPath}`);
    await page.waitForFunction(
      () => (window as unknown as { __glowframeReady?: boolean }).__glowframeReady === true,
    );
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exports a valid non-blank 4K (3840x2160) PNG still frame', async () => {
    const pngDataUrl = await page.evaluate(
      async ({ scene, res }) => {
        const win = window as unknown as {
          createRenderer: (opts: unknown) => {
            renderFrame: (t?: number) => void;
            dispose: () => void;
          };
          ManualClock: new (initialMs: number) => unknown;
        };

        const canvas = document.createElement('canvas');
        canvas.width = res.width;
        canvas.height = res.height;

        const clock = new win.ManualClock(1000);
        const renderer = win.createRenderer({
          canvas,
          scene: {
            ...scene,
            performance: {
              ...scene.performance,
              resolutionScale: 1.0,
            },
          },
          clock,
        });

        renderer.renderFrame(1000);
        const dataUrl = canvas.toDataURL('image/png');
        renderer.dispose();
        canvas.remove();
        return dataUrl;
      },
      { scene: exampleScene, res: PRESET_RESOLUTIONS.UHD_4K },
    );

    expect(pngDataUrl).toMatch(/^data:image\/png;base64,/);
    const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // 4K PNG with glow must be substantially non-empty
    expect(buffer.length).toBeGreaterThan(100000);

    // Verify PNG header signature (89 50 4E 47 0D 0A 1A 0A)
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);

    // Verify the image contains non-black pixels (glowing rim)
    const hasColor = await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));

      const testCanvas = document.createElement('canvas');
      testCanvas.width = 100;
      testCanvas.height = 100;
      const ctx = testCanvas.getContext('2d')!;
      // Draw center region of 4K canvas (where glow exists)
      ctx.drawImage(img, 1820, 980, 200, 200, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100).data;

      let maxLuminance = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i] ?? 0;
        const g = imgData[i + 1] ?? 0;
        const b = imgData[i + 2] ?? 0;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > maxLuminance) maxLuminance = lum;
      }
      return maxLuminance;
    }, pngDataUrl);

    expect(hasColor).toBeGreaterThan(50);
  }, 20000);

  it('exports an HTML pack that runs completely offline when unzipped', async () => {
    const bundledCoreJs = fs.readFileSync(coreDistPath, 'utf-8');
    const zipBytes = await exportHtmlPack({
      scene: exampleScene,
      bundledCoreJs,
    });

    const unzipped = unzipSync(zipBytes);
    expect(unzipped['index.html']).toBeDefined();
    expect(unzipped['scene.json']).toBeDefined();
    expect(unzipped['glowframe-core.js']).toBeDefined();

    // Write extracted files to temp directory
    for (const [filename, content] of Object.entries(unzipped)) {
      fs.writeFileSync(path.join(tempDir, filename), Buffer.from(content));
    }

    // Launch page with all external network requests blocked (strict offline simulation)
    const offlinePage = await browser.newPage({
      viewport: { width: 800, height: 600 },
    });

    let networkBlockedCount = 0;
    await offlinePage.route('**', (route) => {
      const url = route.request().url();
      if (!url.startsWith('file://')) {
        networkBlockedCount++;
        route.abort();
      } else {
        route.continue();
      }
    });

    const offlineHtmlUrl = `file://${path.join(tempDir, 'index.html')}`;
    await offlinePage.goto(offlineHtmlUrl);

    // Wait for canvas to be populated and render
    await offlinePage.waitForSelector('#wallpaper-canvas');
    await offlinePage.waitForTimeout(500);

    const canvasWidth = await offlinePage.evaluate(() => {
      const c = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
      return c ? c.width : 0;
    });

    expect(canvasWidth).toBeGreaterThan(0);
    expect(networkBlockedCount).toBe(0); // Zero external network requests needed

    await offlinePage.close();
  }, 20000);

  it('exports scene JSON that re-parses identically with schema validator', () => {
    const exportedJson = exportSceneJson(exampleScene);
    const parsed = parseScene(JSON.parse(exportedJson));
    expect(parsed.meta.id).toBe(exampleScene.meta.id);
    expect(parsed.shape.type).toBe(exampleScene.shape.type);
    expect(parsed.mode.id).toBe(exampleScene.mode.id);
  });
});
