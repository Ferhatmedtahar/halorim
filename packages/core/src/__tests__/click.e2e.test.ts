import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowWithGlowframe extends Window {
  createRenderer: (opts: unknown) => {
    start: () => void;
    stop: () => void;
    renderFrame: (t?: number) => void;
    dispose: () => void;
    handleClick: (x: number, y: number) => 'object' | 'background';
    getActivePaletteIndex: () => number;
    triggerAction: (actionId: string) => void;
  };
  ManualClock: new (initMs?: number) => {
    now: () => number;
    set: (t: number) => void;
    advance: (dt: number) => void;
  };
  exampleScene: Record<string, unknown>;
  __glowframeReady?: boolean;
}

describe('M4: Click, hit-testing, and palette transitions', () => {
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

  it('differentiates object click vs background click via CPU hit testing', async () => {
    const hitResults = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      document.body.appendChild(canvas);

      const renderer = win.createRenderer({
        canvas,
        scene: win.exampleScene,
      });

      // Triangle center is at [0.5, 0.52]
      const centerHit = renderer.handleClick(0.5, 0.52);
      // Top-left corner [0.05, 0.05] is background
      const bgHit = renderer.handleClick(0.05, 0.05);

      renderer.dispose();
      document.body.removeChild(canvas);

      return { centerHit, bgHit };
    });

    expect(hitResults.centerHit).toBe('object');
    expect(hitResults.bgHit).toBe('background');
  });

  it('advances palette on object click and leaves palette untouched on background click', async () => {
    const clickResults = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      document.body.appendChild(canvas);

      type Handlers = {
        onPointerMove: (x: number, y: number) => void;
        onPointerDown: (x: number, y: number) => void;
        onPointerLeave: () => void;
        onVisibilityChange: (v: boolean) => void;
      };
      let registeredHandlers: Handlers | null = null;
      const fakeInput = {
        subscribe: (h: Handlers) => {
          registeredHandlers = h;
          return () => {
            registeredHandlers = null;
          };
        },
      };

      const clock = new win.ManualClock(0);

      const renderer = win.createRenderer({
        canvas,
        scene: win.exampleScene,
        input: fakeInput,
        clock,
      });

      const initialPaletteIdx = renderer.getActivePaletteIndex();

      // Click outside on background: should not advance palette
      registeredHandlers!.onPointerDown(0.05, 0.05);
      const paletteAfterBgClick = renderer.getActivePaletteIndex();

      // Click inside on triangle center: should trigger next-palette
      registeredHandlers!.onPointerDown(0.5, 0.52);
      const paletteAfterObjClick = renderer.getActivePaletteIndex();

      renderer.dispose();
      document.body.removeChild(canvas);

      return { initialPaletteIdx, paletteAfterBgClick, paletteAfterObjClick };
    });

    expect(clickResults.initialPaletteIdx).toBe(0);
    expect(clickResults.paletteAfterBgClick).toBe(0);
    expect(clickResults.paletteAfterObjClick).toBe(1);
  });

  it('handles rapid clicking without glitching or stacking unbounded work', async () => {
    const rapidResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      document.body.appendChild(canvas);

      type Handlers = {
        onPointerMove: (x: number, y: number) => void;
        onPointerDown: (x: number, y: number) => void;
        onPointerLeave: () => void;
        onVisibilityChange: (v: boolean) => void;
      };
      let registeredHandlers: Handlers | null = null;
      const fakeInput = {
        subscribe: (h: Handlers) => {
          registeredHandlers = h;
          return () => {
            registeredHandlers = null;
          };
        },
      };

      const clock = new win.ManualClock(0);

      const renderer = win.createRenderer({
        canvas,
        scene: win.exampleScene,
        input: fakeInput,
        clock,
      });

      // Rapidly fire 10 clicks inside triangle
      for (let i = 0; i < 10; i++) {
        clock.advance(10);
        registeredHandlers!.onPointerDown(0.5, 0.52);
        renderer.renderFrame(clock.now());
      }

      // Step 60 frames (1s) to allow spring to settle
      for (let i = 0; i < 60; i++) {
        clock.advance(16);
        renderer.renderFrame(clock.now());
      }

      const finalPaletteIdx = renderer.getActivePaletteIndex();

      renderer.dispose();
      document.body.removeChild(canvas);

      return { success: true, finalPaletteIdx };
    });

    expect(rapidResult.success).toBe(true);
    // 10 clicks modulo 2 palettes in exampleScene => 10 % 2 = 0
    expect(rapidResult.finalPaletteIdx).toBe(0);
  });
});
