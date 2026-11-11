import type { InputSource, InputHandlers } from '@glowframe/core';

export class HostInput implements InputSource {
  private handlers = new Set<InputHandlers>();
  private active = false;
  private lastMoveAt = 0;

  /**
   * On some sessions (GNOME Wayland via XWayland) the host stops receiving pointer positions while
   * the mouse is over native Wayland windows, leaving the last known spot frozen. If no movement
   * arrives for `timeoutMs`, the pointer is treated as having left so the wallpaper goes back to its
   * free-running animation instead of staying aimed at a cursor that is no longer there.
   * Returns true when it emitted a leave.
   */
  checkStale(nowMs: number, timeoutMs: number = 3000): boolean {
    if (this.active && nowMs - this.lastMoveAt > timeoutMs) {
      this.emitPointerLeave();
      return true;
    }
    return false;
  }

  subscribe(handlers: InputHandlers): () => void {
    this.handlers.add(handlers);
    return () => {
      this.handlers.delete(handlers);
    };
  }

  emitPointerMove(x: number, y: number, nowMs: number = performance.now()): void {
    this.active = true;
    this.lastMoveAt = nowMs;
    for (const handler of this.handlers) {
      handler.onPointerMove(x, y);
    }
  }

  emitPointerDown(x: number, y: number): void {
    for (const handler of this.handlers) {
      handler.onPointerDown(x, y);
    }
  }

  emitPointerLeave(): void {
    this.active = false;
    for (const handler of this.handlers) {
      handler.onPointerLeave();
    }
  }

  emitVisibilityChange(visible: boolean): void {
    for (const handler of this.handlers) {
      handler.onVisibilityChange(visible);
    }
  }
}
