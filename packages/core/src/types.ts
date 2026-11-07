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
  // Read-only inspection methods for tests
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly currentScene: Scene;
}
