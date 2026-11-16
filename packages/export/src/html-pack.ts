import { Scene, parseScene } from '@glowframe/schema';
import { zipSync, strToU8 } from 'fflate';

export interface ExportHtmlPackOptions {
  scene: Scene;
  title?: string;
  bundledCoreJs?: string;
}

const DEFAULT_README = `Glowframe Interactive Wallpaper Pack
========================================
This standalone pack runs an interactive WebGL2 wallpaper offline.

Usage with Lively Wallpaper (Windows):
1. Open Lively Wallpaper.
2. Click "Add Wallpaper".
3. Select this folder (or point to index.html).

Usage in Web Browser:
- Simply open index.html in any modern browser with WebGL2 support.

Controls:
- Pointer movement guides the directional prism rim light.
- Clicking the center shape cycles palettes and triggers effects.
- Automatically eases into an idle orbit after 3 seconds of inactivity.
`;

/** Base64 of raw bytes, chunked so large bundles do not overflow the call stack. Works in browsers and Node. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Builds the wallpaper page.
 *
 * With `inlineCoreJs`, the renderer is embedded in the page itself. That matters because browsers (and Lively
 * Wallpaper) refuse to load an external module script from a file:// page, so a pack that imports
 * `./glowframe-core.js` shows a black screen when index.html is opened from disk.
 */
export function generateStandaloneHtml(
  scene: Scene,
  coreJsPath = './glowframe-core.js',
  inlineCoreJs?: string,
): string {
  const sceneJson = JSON.stringify(scene, null, 2);
  const loadCore = inlineCoreJs
    ? `const coreBytes = Uint8Array.from(atob('${toBase64(strToU8(inlineCoreJs))}'), (c) => c.charCodeAt(0));
    const coreUrl = URL.createObjectURL(new Blob([coreBytes], { type: 'text/javascript' }));
    const { createRenderer, BrowserInput } = await import(coreUrl);`
    : `const { createRenderer, BrowserInput } = await import('${coreJsPath}');`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${scene.meta.name} - Glowframe Wallpaper</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${scene.background.color || '#000000'};
    }
    #wallpaper-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="wallpaper-canvas"></canvas>

  <script id="glowframe-scene" type="application/json">
${sceneJson}
  </script>

  <script type="module">
    ${loadCore}

    const canvas = document.getElementById('wallpaper-canvas');
    const sceneData = JSON.parse(document.getElementById('glowframe-scene').textContent);
    const input = new BrowserInput(canvas);

    const renderer = createRenderer({
      canvas,
      scene: sceneData,
      input,
    });

    function resize() {
      renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    }

    window.addEventListener('resize', resize);
    resize();
    renderer.start();
  </script>
</body>
</html>`;
}

/**
 * Packs the scene into a standalone, offline-ready ZIP archive using fflate.
 */
export async function exportHtmlPack(options: ExportHtmlPackOptions): Promise<Uint8Array> {
  const validatedScene = parseScene(options.scene);
  const sceneJsonStr = JSON.stringify(validatedScene, null, 2);
  const coreImportPath = options.bundledCoreJs
    ? './glowframe-core.js'
    : 'https://cdn.jsdelivr.net/npm/@glowframe/core@0.6.0/dist/index.js';
  const htmlContent = generateStandaloneHtml(validatedScene, coreImportPath, options.bundledCoreJs);

  const files: Record<string, Uint8Array> = {
    'index.html': strToU8(htmlContent),
    'scene.json': strToU8(sceneJsonStr),
    'README.txt': strToU8(DEFAULT_README),
  };

  if (options.bundledCoreJs) {
    files['glowframe-core.js'] = strToU8(options.bundledCoreJs);
  }

  const zipped = zipSync(files, { level: 6 });
  return zipped;
}
