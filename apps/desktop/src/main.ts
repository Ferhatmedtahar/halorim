import { createRenderer } from '@glowframe/core';
import { PRESET_SCENES, triangleScene } from '@glowframe/presets';
import { type Scene, parseScene } from '@glowframe/schema';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
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

// Multi-monitor independent palette state
function getActiveMonitorIndex(): number {
  try {
    const win = getCurrentWebviewWindow();
    if (win && win.label) {
      const match = win.label.match(/wallpaper-(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
  } catch {
    // Non-Tauri environment fallback
  }
  const params = new URLSearchParams(window.location.search);
  const monitorParam = params.get('monitor');
  return monitorParam ? parseInt(monitorParam, 10) : 0;
}

const monitorIndex = getActiveMonitorIndex();
const storageKey = `glowframe_palette_monitor_${monitorIndex}`;

// Default palette: screen 0 -> monochrome/grey (0), screen 1 -> cyan/blue (3), etc.
const numPalettes = currentScene.palettes.length;
const defaultPaletteIndex = monitorIndex === 1 ? 3 : (monitorIndex % numPalettes);
const savedPaletteStr = localStorage.getItem(storageKey);
let targetPaletteIndex = defaultPaletteIndex;
if (savedPaletteStr !== null) {
  const parsed = parseInt(savedPaletteStr, 10);
  if (!Number.isNaN(parsed) && parsed >= 0 && parsed < numPalettes) {
    targetPaletteIndex = parsed;
  }
}

// Advance to target palette if needed
if (targetPaletteIndex > 0 && targetPaletteIndex < numPalettes) {
  for (let i = 0; i < targetPaletteIndex; i++) {
    renderer.triggerAction('next-palette');
  }
}

function persistActivePalette() {
  const activeIdx = renderer.getActivePaletteIndex();
  localStorage.setItem(storageKey, String(activeIdx));
}

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
  persistActivePalette();
});

canvas.addEventListener('pointerleave', () => {
  hostInput.emitPointerLeave();
});

interface CursorEventPayload {
  monitor?: number;
  x: number;
  y: number;
}

interface LeaveEventPayload {
  monitor?: number;
}

const handlePointerMove = (x: number, y: number, monitor?: number) => {
  if (monitor === undefined || monitor === monitorIndex) {
    hostInput.emitPointerMove(x, y);
  }
};

let lastDownTime = 0;
const handlePointerDown = (x: number, y: number, monitor?: number) => {
  const now = performance.now();
  if (now - lastDownTime < 120) return;
  if (monitor === undefined || monitor === monitorIndex) {
    lastDownTime = now;
    hostInput.emitPointerDown(x, y);
    persistActivePalette();
  }
};

const handlePointerLeave = (monitor?: number) => {
  if (monitor === undefined || monitor === monitorIndex) {
    hostInput.emitPointerLeave();
  }
};

// Top-level Tauri IPC listeners
listen<CursorEventPayload>('glowframe://cursor-move', (event) => {
  handlePointerMove(event.payload.x, event.payload.y, event.payload.monitor);
}).catch((err) => {
  console.debug('Tauri IPC not active in current environment:', err);
});

listen<CursorEventPayload>('glowframe://cursor-down', (event) => {
  handlePointerDown(event.payload.x, event.payload.y, event.payload.monitor);
}).catch(() => {});

listen<LeaveEventPayload>('glowframe://cursor-leave', (event) => {
  handlePointerLeave(event.payload.monitor);
}).catch(() => {});

listen<{ paused: boolean }>('glowframe://set-paused', (event) => {
  renderer.setPaused(event.payload.paused);
}).catch(() => {});

listen<{ fps: number }>('glowframe://set-fps-cap', (event) => {
  renderer.setFpsCap(event.payload.fps);
}).catch(() => {});

listen<{ scale: number }>('glowframe://set-resolution-scale', (event) => {
  renderer.setResolutionScale(event.payload.scale);
}).catch(() => {});

listen<{ intensity: number }>('glowframe://set-glow-intensity', (event) => {
  currentScene = {
    ...currentScene,
    edge: {
      ...currentScene.edge,
      intensity: event.payload.intensity,
    },
  };
  renderer.setScene(currentScene);
}).catch(() => {});

listen<{ speed: number }>('glowframe://set-rotation-speed', (event) => {
  currentScene = {
    ...currentScene,
    mode: {
      ...currentScene.mode,
      params: {
        ...currentScene.mode.params,
        speed: event.payload.speed,
      },
    },
  };
  renderer.setScene(currentScene);
}).catch(() => {});

listen<{ presetId?: string; sceneData?: unknown }>('glowframe://set-scene', (event) => {
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
}).catch(() => {});

