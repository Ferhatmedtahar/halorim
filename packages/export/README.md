# @glowframe/export

Export utilities for the Glowframe interactive desktop wallpaper engine.

## Features

- **PNG Still Export (`exportPng`)**: High-resolution deterministic render (1080p, 1440p, 4K UHD, or custom).
- **Scene Serialization (`exportSceneJson`)**: Validated JSON export for `.glowframe.json` files.
- **Standalone HTML Pack (`exportHtmlPack`)**: Self-contained offline ZIP archive for Lively Wallpaper and browser runners.

## Public API

```ts
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';

// 1. Export 4K PNG
const pngBlob = await exportPng({
  scene,
  width: PRESET_RESOLUTIONS.UHD_4K.width,
  height: PRESET_RESOLUTIONS.UHD_4K.height,
});

// 2. Export Scene JSON
const jsonString = exportSceneJson(scene);

// 3. Export Standalone Offline ZIP
const zipBytes = await exportHtmlPack({ scene });
```

## Testing & Building

```bash
pnpm build
pnpm test
```
