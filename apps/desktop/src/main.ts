import { createRenderer } from '@glowframe/core';
import { PRESET_SCENES, triangleScene } from '@glowframe/presets';
import { type Scene, parseScene } from '@glowframe/schema';
import { HostInput } from './host-input.ts';

const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Missing #wallpaper-canvas element');
}

const hostInput = new HostInput();
let currentScene: Scene = triangleScene;

const renderer = createRenderer({
  canvas,
  scene: currentScene,
  input: hostInput,
});

function resize() {
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(window.innerWidth, window.innerHeight, dpr);
}

window.addEventListener('resize', resize);
resize();
renderer.start();

// Fallback local pointer events for development / interactive window mode
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  hostInput.emitPointerMove(x, y);
});

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  hostInput.emitPointerDown(x, y);
});

canvas.addEventListener('pointerleave', () => {
  hostInput.emitPointerLeave();
});

// Setup Tauri IPC event listeners if running inside Tauri webview
async function setupTauriEvents() {
  try {
    const { listen } = await import('@tauri-apps/api/event');

    await listen<{ x: number; y: number }>('glowframe://cursor-move', (event) => {
      hostInput.emitPointerMove(event.payload.x, event.payload.y);
    });

    await listen<{ x: number; y: number }>('glowframe://cursor-down', (event) => {
      hostInput.emitPointerDown(event.payload.x, event.payload.y);
    });

    await listen('glowframe://cursor-leave', () => {
      hostInput.emitPointerLeave();
    });

    await listen<{ paused: boolean }>('glowframe://set-paused', (event) => {
      renderer.setPaused(event.payload.paused);
    });

    await listen<{ fps: number }>('glowframe://set-fps-cap', (event) => {
      renderer.setFpsCap(event.payload.fps);
    });

    await listen<{ scale: number }>('glowframe://set-resolution-scale', (event) => {
      renderer.setResolutionScale(event.payload.scale);
    });

    await listen<{ presetId?: string; sceneData?: unknown }>('glowframe://set-scene', (event) => {
      if (event.payload.presetId && PRESET_SCENES[event.payload.presetId]) {
        const nextScene = PRESET_SCENES[event.payload.presetId];
        if (nextScene) {
          currentScene = nextScene;
          renderer.setScene(currentScene);
        }
      } else if (event.payload.sceneData) {
        currentScene = parseScene(event.payload.sceneData);
        renderer.setScene(currentScene);
      }
    });
  } catch (err) {
    // Running in browser dev mode without Tauri IPC
    console.debug('Tauri API not active in current environment:', err);
  }
}

void setupTauriEvents();
