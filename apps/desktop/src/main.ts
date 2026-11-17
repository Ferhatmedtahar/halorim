import { createRenderer } from '@glowframe/core';
import { PRESET_SCENES, triangleScene } from '@glowframe/presets';
import { type Scene, parseScene, decodeSvgSettings } from '@glowframe/schema';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { HostInput } from './host-input.ts';

const canvas = document.getElementById('wallpaper-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Missing #wallpaper-canvas element');
}

const hostInput = new HostInput();
let currentScene: Scene = triangleScene;
// The selected scene before shared overrides (glow/speed) are layered on top.
let baseScene: Scene = triangleScene;

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

// Forward errors to the host log file (~/.config/glowframe/glowframe.log) so problems on a screen
// that nobody is looking at can still be diagnosed.
function hostLog(level: string, message: string) {
  void invoke('log_line', { line: `[monitor ${monitorIndex}] ${level}: ${message}` }).catch(() => {});
}
window.addEventListener('error', (e) => hostLog('error', `${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => hostLog('rejection', String(e.reason)));
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
  hostLog('console.error', args.map(String).join(' '));
};
hostLog('info', `started, visibility=${document.visibilityState}`);
const storageKey = `glowframe_palette_monitor_${monitorIndex}`;

// Colors are per-screen; everything else (shape, glow, speed) is shared by all screens.
// Default palette: screen 0 -> first (brand) palette, screen 1 -> a contrasting one.
function storedPaletteIndex(): number {
  const n = currentScene.palettes.length;
  const fallback = monitorIndex === 0 ? 0 : Math.min(monitorIndex * 2, n - 1);
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) {
    const parsed = parseInt(saved, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < n) return parsed;
  }
  return fallback;
}

function persistActivePalette() {
  const activeIdx = renderer.getActivePaletteIndex();
  localStorage.setItem(storageKey, String(activeIdx));
  scheduleSnapshot();
}

// Settings shared across screens (persisted so a restart keeps them).
interface SharedSettings {
  presetId?: string;
  glow?: number;
  speed?: number;
  /** Background color (any CSS color). Unset = the preset's own (black). */
  background?: string;
  /** Object (silhouette) color. Unset = the preset's own (black). */
  fill?: string;
  /** Custom shape loaded from an SVG file (kept so it survives a restart). Wins over presetId. */
  customSvg?: string;
}
const SETTINGS_KEY = 'glowframe_settings';
function loadSettings(): SharedSettings {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as SharedSettings;
  } catch {
    return {};
  }
}
const settings: SharedSettings = loadSettings();
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Applies the shared overrides (glow, speed) on top of a scene. */
function withOverrides(scene: Scene): Scene {
  return {
    ...scene,
    edge: { ...scene.edge, intensity: settings.glow ?? scene.edge.intensity },
    background: { ...scene.background, color: settings.background ?? scene.background.color },
    fill: { ...scene.fill, color: settings.fill ?? scene.fill.color },
    mode: {
      ...scene.mode,
      params: { ...scene.mode.params, speed: settings.speed ?? scene.mode.params['speed'] },
    },
  };
}

/**
 * Both screens share localStorage. If a window missed a tray event (e.g. its webview was throttled
 * while another desktop was active), it catches up from the saved shared settings instead.
 */
function syncFromStorage() {
  const stored = loadSettings();
  if (
    stored.presetId === settings.presetId &&
    stored.glow === settings.glow &&
    stored.speed === settings.speed &&
    stored.background === settings.background &&
    stored.fill === settings.fill &&
    stored.customSvg === settings.customSvg
  ) {
    return;
  }
  settings.presetId = stored.presetId;
  settings.glow = stored.glow;
  settings.speed = stored.speed;
  settings.background = stored.background;
  settings.fill = stored.fill;
  settings.customSvg = stored.customSvg;
  syncPageBackground();
  void applyScene(savedScene() ?? baseScene);
}
window.addEventListener('storage', (e) => {
  if (e.key === SETTINGS_KEY) syncFromStorage();
});
setInterval(syncFromStorage, 1000);

/**
 * Scene for a custom SVG. Glow settings embedded by the Studio export (see decodeSvgSettings) are
 * used when present; anything missing falls back to the same look as the built-in logos.
 */
function customSvgScene(svg: string): Scene {
  const embedded = decodeSvgSettings(svg);
  const edge = embedded?.edge ?? {};
  return parseScene({
    ...triangleScene,
    meta: { ...triangleScene.meta, id: 'custom-svg', name: 'Custom SVG', tags: ['custom'] },
    shape: {
      type: 'svg-file',
      asset: svg,
      fillHoles: false,
      closeGaps: 14,
      position: [0.5, 0.52],
      scale: embedded?.scale ?? 0.34,
      rotation: 0,
    },
    edge: {
      width: edge.width ?? 0.0045,
      falloff: edge.falloff ?? 0.045,
      intensity: edge.intensity ?? 1.45,
      dispersion: edge.dispersion ?? 0.38,
      colorFlow: 'surface',
    },
    palettes: embedded?.palette ? [embedded.palette, ...triangleScene.palettes] : triangleScene.palettes,
    mode: { id: 'rotate', params: { speed: embedded?.speed ?? 0.05 } },
  });
}

/** The scene the saved settings point at: a custom SVG first, then a named preset. */
function savedScene(): Scene | undefined {
  if (settings.customSvg) {
    try {
      return customSvgScene(settings.customSvg);
    } catch (err) {
      console.error('[Glowframe] Saved custom SVG could not be loaded:', err);
    }
  }
  return settings.presetId ? PRESET_SCENES[settings.presetId] : undefined;
}

/** Single path for every scene change: shape/glow/speed shared, palette stays per-screen. */
function applyScene(scene: Scene): boolean {
  hostLog('info', `applyScene ${scene.meta.id}`);
  const prevBase = baseScene;
  const prevCurrent = currentScene;
  try {
    baseScene = scene;
    currentScene = withOverrides(scene);
    renderer.setScene(currentScene); // builds the shape first: invalid art throws before any change
    renderer.setActivePalette(storedPaletteIndex());
    scheduleSnapshot();
    return true;
  } catch (err) {
    baseScene = prevBase;
    currentScene = prevCurrent;
    console.error('[Glowframe] Could not apply scene:', err);
    return false;
  }
}

// Publish a still of the current wallpaper so the Super/Activities overview and the desktop
// background (when the live window is hidden) show the glowing logo instead of a black screen.
let snapshotTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSnapshot() {
  if (monitorIndex !== 0) return;
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    try {
      // The drawing buffer is preserved, so the frame on screen is captured as it is. (Rendering a
      // special frame for the snapshot made the live wallpaper visibly jump.)
      canvas.toBlob((blob) => {
        if (!blob) return;
        void blob.arrayBuffer().then((buf) =>
          invoke('save_snapshot', new Uint8Array(buf), { headers: { monitor: String(monitorIndex) } }),
        ).catch(() => {});
      }, 'image/png');
    } catch {
      // Snapshot is best-effort; never disturb the live wallpaper.
    }
  }, 1500);
}

applyScene(savedScene() ?? currentScene);

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

// Treat a pointer that stopped reporting movement as gone (see HostInput.checkStale).
setInterval(() => {
  hostInput.checkStale(performance.now());
}, 500);

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

let externallyPaused = false;
listen<{ paused: boolean }>('glowframe://set-paused', (event) => {
  externallyPaused = event.payload.paused;
  renderer.setPaused(externallyPaused);
}).catch(() => {});

// --- Never let the wallpaper stay frozen ---------------------------------------------------------
// The wallpaper is shown by the compositor in places the webview knows nothing about (Activities
// overview, workspace switching, under the desktop icons), so "page hidden" is never a reason to
// stop drawing: only an explicit pause (tray, battery saver) is.
function resumeRendering() {
  hostInput.emitVisibilityChange(true);
  renderer.setPaused(externallyPaused);
}
document.addEventListener('visibilitychange', resumeRendering);
window.addEventListener('focus', resumeRendering);
window.addEventListener('pageshow', resumeRendering);

// If the browser stops delivering animation frames (it may when it believes the page is hidden),
// keep drawing from a timer so the picture never freezes.
const PUMP_INTERVAL_MS = 1000 / 30;
let lastSeenTime = -1;
let stalledTicks = 0;
setInterval(() => {
  if (externallyPaused) {
    stalledTicks = 0;
    return;
  }
  const t = renderer.getUniformValues().u_time;
  if (t !== lastSeenTime) {
    lastSeenTime = t;
    stalledTicks = 0;
    return;
  }
  stalledTicks++;
  if (stalledTicks < 4) return; // ~130 ms without a frame
  if (stalledTicks === 4) {
    hostLog('info', `animation frames stalled (visibility=${document.visibilityState}), drawing from timer`);
    // Re-arm the normal loop; it takes over again as soon as frames come back.
    renderer.stop();
    renderer.start();
    resumeRendering();
  }
  renderer.renderFrame(performance.now());
  lastSeenTime = renderer.getUniformValues().u_time;
}, PUMP_INTERVAL_MS);

listen<{ fps: number }>('glowframe://set-fps-cap', (event) => {
  renderer.setFpsCap(event.payload.fps);
}).catch(() => {});

listen<{ scale: number }>('glowframe://set-resolution-scale', (event) => {
  renderer.setResolutionScale(event.payload.scale);
}).catch(() => {});

listen<{ intensity: number }>('glowframe://set-glow-intensity', (event) => {
  settings.glow = event.payload.intensity;
  saveSettings();
  applyScene(baseScene);
}).catch(() => {});

// The page behind the canvas uses the same color, so nothing flashes black while (re)loading.
function syncPageBackground() {
  const color = settings.background ?? '#000000';
  document.documentElement.style.setProperty('background', color, 'important');
  document.body.style.setProperty('background', color, 'important');
  canvas.style.setProperty('background', color, 'important');
}
syncPageBackground();

// Background / object colors (shared by all screens). A missing field keeps the current value;
// "default" goes back to the preset's own color.
listen<{ background?: string; fill?: string }>('glowframe://set-colors', (event) => {
  const { background, fill } = event.payload;
  if (background !== undefined) settings.background = background === 'default' ? undefined : background;
  if (fill !== undefined) settings.fill = fill === 'default' ? undefined : fill;
  saveSettings();
  syncPageBackground();
  applyScene(baseScene);
}).catch(() => {});

listen<{ speed: number }>('glowframe://set-rotation-speed', (event) => {
  settings.speed = event.payload.speed;
  saveSettings();
  applyScene(baseScene);
}).catch(() => {});

listen<{ svg: string }>('glowframe://load-custom-svg', (event) => {
  const svg = event.payload.svg;
  const embedded = decodeSvgSettings(svg);
  let next: Scene;
  try {
    next = customSvgScene(svg);
  } catch (err) {
    console.error('[Glowframe] Could not load custom SVG:', err);
    return;
  }
  // Settings carried by the file win over the tray's glow/speed until the user changes them again.
  if (embedded?.edge?.intensity !== undefined) settings.glow = undefined;
  if (embedded?.speed !== undefined) settings.speed = undefined;
  // A file with its own palette starts on that palette on every screen.
  if (embedded?.palette) localStorage.setItem(storageKey, '0');
  if (applyScene(next)) {
    settings.presetId = undefined; // custom art is not a named preset
    settings.customSvg = svg;
    saveSettings();
  }
}).catch(() => {});

listen<{ presetId?: string; sceneData?: unknown }>('glowframe://set-scene', (event) => {
  if (event.payload.presetId && PRESET_SCENES[event.payload.presetId]) {
    const next = PRESET_SCENES[event.payload.presetId];
    if (next && applyScene(next)) {
      settings.presetId = event.payload.presetId;
      settings.customSvg = undefined;
      saveSettings();
    }
  } else if (event.payload.sceneData) {
    applyScene(parseScene(event.payload.sceneData));
  }
}).catch(() => {});
