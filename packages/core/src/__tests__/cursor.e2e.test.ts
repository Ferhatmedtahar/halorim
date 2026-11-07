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
    getCursorPosition: () => [number, number];
    getTargetCursorPosition: () => [number, number];
    isIdleOrbitActive: () => boolean;
    getUniformValues: () => {
      u_cursorPos: [number, number];
      u_hasCursor: number;
      u_cursorSharpness: number;
      u_hazeIntensity: number;
    };
  };
  ManualClock: new (initMs?: number) => {
    now: () => number;
    set: (t: number) => void;
    advance: (dt: number) => void;
  };
  exampleScene: Record<string, unknown>;
  __glowframeReady?: boolean;
}

describe('M3: Cursor light, smoothing, and idle orbit', () => {
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

  it('drives a fake InputSource and verifies smooth cursor easing and uniform values', async () => {
    const trackingResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
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

      const clock = new win.ManualClock(1000);

      const renderer = win.createRenderer({
        canvas,
        scene: {
          ...win.exampleScene,
          interaction: {
            ...((win.exampleScene['interaction'] as Record<string, unknown>) ?? {}),
            smoothing: 0.1, // 10% easing per frame
            idleOrbit: true,
            idleTimeoutMs: 3000,
          },
        },
        input: fakeInput,
        clock,
      });

      // Frame 0 at t=1000, pointer not moved yet (idle)
      renderer.renderFrame(1000);
      const initCursor = renderer.getCursorPosition();

      // Pointer moves to [0.8, 0.2]
      registeredHandlers!.onPointerMove(0.8, 0.2);
      const targetPosAfterMove = renderer.getTargetCursorPosition();

      // Step 1 frame
      clock.advance(16);
      renderer.renderFrame(clock.now());
      const step1Cursor = renderer.getCursorPosition();

      // Step 2 frame
      clock.advance(16);
      renderer.renderFrame(clock.now());
      const step2Cursor = renderer.getCursorPosition();

      // Step 30 frames: should get very close to [0.8, 0.2]
      for (let i = 0; i < 30; i++) {
        clock.advance(16);
        renderer.renderFrame(clock.now());
      }
      const settledCursor = renderer.getCursorPosition();
      const uniforms = renderer.getUniformValues();

      renderer.dispose();
      document.body.removeChild(canvas);

      return {
        initCursor,
        targetPosAfterMove,
        step1Cursor,
        step2Cursor,
        settledCursor,
        uniforms,
      };
    });

    expect(trackingResult.targetPosAfterMove).toEqual([0.8, 0.2]);
    // Cursor moved smoothly (step1 moves toward target, step2 moves further)
    expect(trackingResult.step1Cursor[0]).toBeGreaterThan(trackingResult.initCursor[0]);
    expect(trackingResult.step2Cursor[0]).toBeGreaterThan(trackingResult.step1Cursor[0]);
    // Settled cursor is close to target [0.8, 0.2]
    expect(trackingResult.settledCursor[0]).toBeCloseTo(0.8, 1);
    expect(trackingResult.settledCursor[1]).toBeCloseTo(0.2, 1);
    // Uniforms reflect cursor state
    expect(trackingResult.uniforms.u_hasCursor).toBe(1.0);
    expect(trackingResult.uniforms.u_cursorPos[0]).toBeCloseTo(0.8, 1);
    expect(trackingResult.uniforms.u_cursorPos[1]).toBeCloseTo(0.2, 1);
  });

  it('eases into idle orbit after 3 seconds of inactivity and resumes on pointer movement', async () => {
    const orbitResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
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
        scene: {
          ...win.exampleScene,
          interaction: {
            ...((win.exampleScene['interaction'] as Record<string, unknown>) ?? {}),
            smoothing: 0.2,
            idleOrbit: true,
            idleTimeoutMs: 3000,
          },
        },
        input: fakeInput,
        clock,
      });

      // Pointer active at t = 1000
      clock.set(1000);
      registeredHandlers!.onPointerMove(0.7, 0.3);
      renderer.renderFrame(1000);
      const activeOrbitState = renderer.isIdleOrbitActive(); // should be false

      // At t = 2500 (1.5s idle < 3s timeout)
      clock.set(2500);
      renderer.renderFrame(2500);
      const intermediateOrbitState = renderer.isIdleOrbitActive(); // still false

      // At t = 4500 (3.5s idle > 3s timeout) -> triggers idle orbit!
      clock.set(4500);
      renderer.renderFrame(4500);
      const orbitActiveAt35s = renderer.isIdleOrbitActive(); // true
      const targetPos1 = renderer.getTargetCursorPosition();

      // Advance orbit by 1s (t = 5500)
      clock.set(5500);
      renderer.renderFrame(5500);
      const targetPos2 = renderer.getTargetCursorPosition();

      // Resume on new pointer movement
      registeredHandlers!.onPointerMove(0.2, 0.8);
      renderer.renderFrame(5516);
      const orbitStateAfterMove = renderer.isIdleOrbitActive(); // false
      const targetPosResumed = renderer.getTargetCursorPosition();

      renderer.dispose();
      document.body.removeChild(canvas);

      return {
        activeOrbitState,
        intermediateOrbitState,
        orbitActiveAt35s,
        targetPos1,
        targetPos2,
        orbitStateAfterMove,
        targetPosResumed,
      };
    });

    expect(orbitResult.activeOrbitState).toBe(false);
    expect(orbitResult.intermediateOrbitState).toBe(false);
    expect(orbitResult.orbitActiveAt35s).toBe(true);

    // Target position rotated in circular orbit between t=4500 and t=5500
    expect(orbitResult.targetPos1[0]).not.toEqual(orbitResult.targetPos2[0]);
    expect(orbitResult.targetPos1[1]).not.toEqual(orbitResult.targetPos2[1]);

    // Resumed immediately when pointer moved
    expect(orbitResult.orbitStateAfterMove).toBe(false);
    expect(orbitResult.targetPosResumed).toEqual([0.2, 0.8]);
  });

  it('brightens the rim on the side facing the cursor', async () => {
    const rimComparison = await page.evaluate(() => {
      const win = window as unknown as WindowWithGlowframe;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
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
        scene: {
          ...win.exampleScene,
          performance: { fpsCap: 30, resolutionScale: 1.0 },
          interaction: {
            ...((win.exampleScene['interaction'] as Record<string, unknown>) ?? {}),
            smoothing: 1.0, // instant for test
            followCursor: true,
          },
        },
        input: fakeInput,
        clock,
      });

      const gl = canvas.getContext('webgl2')!;
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);

      const samplePoint = (normX: number, normY: number): number => {
        const px = Math.floor(normX * width);
        const py = Math.floor((1.0 - normY) * height);
        const idx = (py * width + px) * 4;
        return pixels[idx]! + pixels[idx + 1]! + pixels[idx + 2]!;
      };

      // Case A: Cursor placed far on the right [0.95, 0.52]
      registeredHandlers!.onPointerMove(0.95, 0.52);
      renderer.renderFrame(100);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Sample right rim (normX ~ 0.58, normY ~ 0.52) vs left rim (normX ~ 0.42, normY ~ 0.52)
      const rightRimWhenCursorRight = samplePoint(0.58, 0.52);
      const leftRimWhenCursorRight = samplePoint(0.42, 0.52);

      // Case B: Cursor placed far on the left [0.05, 0.52]
      registeredHandlers!.onPointerMove(0.05, 0.52);
      renderer.renderFrame(200);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const rightRimWhenCursorLeft = samplePoint(0.58, 0.52);
      const leftRimWhenCursorLeft = samplePoint(0.42, 0.52);

      renderer.dispose();
      document.body.removeChild(canvas);

      return {
        rightRimWhenCursorRight,
        leftRimWhenCursorRight,
        rightRimWhenCursorLeft,
        leftRimWhenCursorLeft,
      };
    });

    // 1. Right rim is brighter when cursor is on the right (facing cursor) vs when cursor is on the left
    expect(rimComparison.rightRimWhenCursorRight).toBeGreaterThan(
      rimComparison.rightRimWhenCursorLeft,
    );

    // 2. Left rim is brighter when cursor is on the left (facing cursor) vs when cursor is on the right
    expect(rimComparison.leftRimWhenCursorLeft).toBeGreaterThan(
      rimComparison.leftRimWhenCursorRight,
    );
  });
});
