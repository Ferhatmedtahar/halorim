import { chromium } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PRESET_SCENES } from '@glowframe/presets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const testHtmlPath = path.resolve(__dirname, '../../../packages/core/test-page/index.html');
  const outputDir = path.resolve(__dirname, '../../../apps/library/public/thumbnails');

  if (!isDryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    const coreDistPath = path.resolve(__dirname, '../../../packages/core/dist/index.js');
    if (fs.existsSync(coreDistPath)) {
      const publicCorePath = path.resolve(
        __dirname,
        '../../../apps/library/public/glowframe-core.js',
      );
      fs.copyFileSync(coreDistPath, publicCorePath);
      console.log('  ✓ Copied glowframe-core.js to apps/library/public/glowframe-core.js');
    }
  }

  const browser = await chromium.launch({
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

  try {
    const page = await browser.newPage({
      viewport: { width: 640, height: 360 },
      deviceScaleFactor: 1,
    });

    await page.goto(`file://${testHtmlPath}`);
    await page.waitForFunction(
      () => (window as unknown as { __glowframeReady?: boolean }).__glowframeReady === true,
    );

    const presets = Object.values(PRESET_SCENES);
    console.log(`Generating thumbnails for ${presets.length} presets (dry-run: ${isDryRun})...`);

    for (const preset of presets) {
      const dataUrl = await page.evaluate((sceneData) => {
        const win = window as unknown as {
          renderer?: { dispose: () => void };
          createRenderer: (opts: unknown) => {
            renderFrame: (t?: number) => void;
            dispose: () => void;
          };
          ManualClock: new (initialMs: number) => unknown;
        };

        if (win.renderer) {
          win.renderer.dispose();
          delete win.renderer;
        }

        const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
        canvas.width = 640;
        canvas.height = 360;

        const clock = new win.ManualClock(1000);
        const r = win.createRenderer({
          canvas,
          scene: {
            ...sceneData,
            performance: {
              ...sceneData.performance,
              resolutionScale: 1.0,
            },
          },
          clock,
        });

        r.renderFrame(1000);
        const url = canvas.toDataURL('image/png');
        r.dispose();
        return url;
      }, preset);

      if (!dataUrl.startsWith('data:image/png;base64,')) {
        throw new Error(`Failed to render PNG thumbnail for ${preset.meta.id}`);
      }

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length < 1000) {
        throw new Error(
          `Generated thumbnail for ${preset.meta.id} is too small (${buffer.length} bytes)`,
        );
      }

      if (!isDryRun) {
        const outPath = path.join(outputDir, `${preset.meta.id}.png`);
        fs.writeFileSync(outPath, buffer);
        console.log(`  ✓ Saved ${preset.meta.id}.png (${buffer.length} bytes)`);
      } else {
        console.log(`  ✓ Verified ${preset.meta.id} (${buffer.length} bytes)`);
      }
    }

    console.log('Thumbnail generation completed successfully.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Thumbnail generation failed:', err);
  process.exit(1);
});
