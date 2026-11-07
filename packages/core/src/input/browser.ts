import type { InputHandlers, InputSource } from '../types.js';

export class BrowserInput implements InputSource {
  private target: HTMLElement | null;

  constructor(target?: HTMLElement | null) {
    this.target = target ?? null;
  }

  public setTarget(target: HTMLElement | null): void {
    this.target = target;
  }

  public subscribe(handlers: InputHandlers): () => void {
    const el = this.target;
    if (!el) {
      return () => {};
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      handlers.onPointerMove(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      handlers.onPointerDown(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    };

    const onPointerLeave = () => {
      handlers.onPointerLeave();
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        handlers.onVisibilityChange(document.visibilityState === 'visible');
      }
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointerleave', onPointerLeave, { passive: true });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
    }

    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerleave', onPointerLeave);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }
}
