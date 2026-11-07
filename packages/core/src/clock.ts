import type { Clock } from './types.js';

export class SystemClock implements Clock {
  public now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

export class ManualClock implements Clock {
  private currentTime: number;

  constructor(initialTimeMs: number = 0) {
    this.currentTime = initialTimeMs;
  }

  public now(): number {
    return this.currentTime;
  }

  public set(timeMs: number): void {
    this.currentTime = timeMs;
  }

  public advance(deltaMs: number): void {
    this.currentTime += deltaMs;
  }
}
