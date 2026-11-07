# @glowframe/core

The core cross-platform WebGL2 interactive wallpaper rendering engine.

## What it does

- Platform-agnostic rendering engine for Glowframe scenes.
- Executes the unified shape pipeline: rasterization → Euclidean Distance Transform (EDT) → signed distance field (SDF) → WebGL2 shader.
- Renders glowing prismatic rim effects with central-difference normal estimation and directional cursor lighting.
- Interpolates color palettes in OKLab for harmonious transitions.
- Supports deterministic frame rendering, dynamic resolution scaling, and strict FPS capping.
- Zero per-frame memory allocations inside the render loop.

## Public API

```ts
import { createRenderer, BrowserInput } from '@glowframe/core';
import { exampleScene } from '@glowframe/schema';

const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
const input = new BrowserInput(canvas);

const renderer = createRenderer({
  canvas,
  scene: exampleScene,
  input,
});

renderer.start();

// Control API
renderer.setScene(updatedScene);
renderer.setPaused(true);
renderer.setResolutionScale(0.5);
renderer.setFpsCap(30);
renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
renderer.renderFrame(1000); // Deterministic offline export
renderer.dispose();
```

## Running Tests

```bash
pnpm --filter @glowframe/core test
```
