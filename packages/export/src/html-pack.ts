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

export function generateStandaloneHtml(scene: Scene, coreJsPath = './glowframe-core.js'): string {
  const sceneJson = JSON.stringify(scene, null, 2);

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
    import { createRenderer, BrowserInput } from '${coreJsPath}';

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
  const htmlContent = generateStandaloneHtml(validatedScene, coreImportPath);

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
