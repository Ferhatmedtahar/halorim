import type { InputSource, InputHandlers } from '@glowframe/core';

export class HostInput implements InputSource {
  private handlers = new Set<InputHandlers>();

  subscribe(handlers: InputHandlers): () => void {
    this.handlers.add(handlers);
    return () => {
      this.handlers.delete(handlers);
    };
  }

  emitPointerMove(x: number, y: number): void {
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
