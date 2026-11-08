import type { Scene } from '@glowframe/schema';

export interface InputHandlers {
  onPointerMove(x: number, y: number): void;
  onPointerDown(x: number, y: number): void;
  onPointerLeave(): void;
  onVisibilityChange(visible: boolean): void;
}

export interface InputSource {
  subscribe(handlers: InputHandlers): () => void;
}

export interface Clock {
  now(): number;
}

export interface RendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  scene: Scene;
  input?: InputSource;
  clock?: Clock;
}

export interface UniformState {
  u_cursorPos: [number, number];
  u_hasCursor: number;
  u_cursorSharpness: number;
  u_hazeIntensity: number;
  u_hoverTransition: number;
  u_lightAngle: number;
  u_shapeType: number;
  u_shapePos: [number, number];
  u_shapeScale: number;
  u_shapeRotation: number;
  u_maxDistance: number;
  u_edgeWidth: number;
  u_edgeFalloff: number;
  u_edgeIntensity: number;
  u_edgeDispersion: number;
  u_time: number;
  u_rotationSpeed: number;
  u_pulseFactor: number;
  u_hueShift: number;
  u_flickerFactor: number;
  u_sweep: [number, number, number, number];
  u_ripple: [number, number, number, number];
  u_burstFactor: number;
  u_hasContent: number;
}

export interface Renderer {
  start(): void;
  stop(): void;
  setScene(scene: Scene): void;
  setPaused(paused: boolean): void;
  setResolutionScale(scale: number): void;
  setFpsCap(fps: number): void;
  resize(width: number, height: number, devicePixelRatio?: number): void;
  renderFrame(timeMs?: number): void;
  dispose(): void;

  // Read-only inspection methods for tests & telemetry
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly currentScene: Scene;
  getCursorPosition(): [number, number];
  getTargetCursorPosition(): [number, number];
  isIdleOrbitActive(): boolean;
  getUniformValues(): Readonly<UniformState>;
  handleClick(x: number, y: number): 'object' | 'background';
  getActivePaletteIndex(): number;
  getActiveMode(): string;
  setMode(id: string, params?: Record<string, unknown>): void;
  triggerAction(
    actionId: string,
    params?: Record<string, unknown>,
    origin?: [number, number],
  ): void;
  isContentVisible(): boolean;
}
