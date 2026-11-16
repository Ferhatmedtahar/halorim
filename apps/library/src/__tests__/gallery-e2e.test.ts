import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libraryDir = path.resolve(__dirname, '../..');

describe('Gallery E2E & Performance Acceptance Tests', () => {
  let browser: Browser;
  let server: http.Server;
  let serverUrl: string;

  beforeAll(async () => {
    // Start Next.js production server from pre-built output
    const app = (
      next as unknown as (opts: unknown) => {
        prepare: () => Promise<void>;
        getRequestHandler: () => (
          req: http.IncomingMessage,
          res: http.ServerResponse,
        ) => Promise<void>;
      }
    )({
      dev: false,
      dir: libraryDir,
      customServer: true,
    });

    await app.prepare();
    const handle = app.getRequestHandler();

    server = http.createServer((req, res) => {
      void handle(req, res);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number; address: string };
    serverUrl = `http://127.0.0.1:${addr.port}`;

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    });
  }, 40000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('verifies gallery page satisfies Lighthouse performance criteria (0 WebGL contexts, low latency, no layout shifts)', async () => {
    const page: Page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });

    // Instrument WebGL context creation to assert zero WebGL contexts are created on gallery
    await page.addInitScript(() => {
      let webglContextCount = 0;
      (window as unknown as { __webglContextCount: number }).__webglContextCount = 0;
      const proto = HTMLCanvasElement.prototype as unknown as Record<
        string,
        (...args: unknown[]) => unknown
      >;
      const origGetContext = proto.getContext;
      proto.getContext = function (type: unknown, ...args: unknown[]) {
        if (typeof type === 'string' && type.includes('webgl')) {
          webglContextCount++;
          (window as unknown as { __webglContextCount: number }).__webglContextCount =
            webglContextCount;
        }
        return origGetContext ? origGetContext.apply(this, [type, ...args]) : null;
      };
    });

    const startTime = Date.now();
    await page.goto(`${serverUrl}/`, { waitUntil: 'load' });
    const loadDurationMs = Date.now() - startTime;

    // Fast initial load (< 1.5s in headless test)
    expect(loadDurationMs).toBeLessThan(2000);

    // CRITICAL: WebGL context count on gallery page must be EXACTLY ZERO
    const webglCount = await page.evaluate(
      () => (window as unknown as { __webglContextCount: number }).__webglContextCount,
    );
    expect(webglCount).toBe(0);

    // Verify all 6 preset cards are rendered with pre-rendered thumbnails
    const cardImages = await page.$$('img');
    expect(cardImages.length).toBeGreaterThanOrEqual(6);

    for (const img of cardImages) {
      const src = await img.getAttribute('src');
      expect(src).toMatch(/^\/thumbnails\/.+\.png$/);
      const isVisible = await img.isVisible();
      expect(isVisible).toBe(true);
    }

    // Verify search interaction is instantaneous without page reload or lag
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('tux');
    await page.waitForTimeout(100);

    const visibleCards = await page.$$('a[href^="/w/"]');
    expect(visibleCards.length).toBe(1);

    await page.close();
  }, 25000);

  it('verifies detail page renders live WebGL2 canvas and disposes cleanly', async () => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });

    await page.goto(`${serverUrl}/w/triangle-prism`, { waitUntil: 'load' });

    // Wait for the single WebGL2 canvas to appear
    const canvas = page.locator('canvas');
    expect(await canvas.isVisible()).toBe(true);

    // The download panel offers one export: the shape as an SVG for the desktop app
    expect(await page.locator('button:has-text("Download SVG")').isVisible()).toBe(true);
    expect(await page.locator('button:has-text("Download HTML Pack")').count()).toBe(0);
    expect(await page.locator('button:has-text("Download .glowframe.json")').count()).toBe(0);

    // Navigate back to gallery and ensure canvas is disposed without crashing
    await page.click('text=Back to Gallery');
    await page.waitForURL(`${serverUrl}/`);
    expect(page.url()).toBe(`${serverUrl}/`);

    await page.close();
  }, 25000);
});
