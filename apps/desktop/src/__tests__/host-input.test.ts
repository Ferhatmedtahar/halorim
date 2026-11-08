import { describe, it, expect, vi } from 'vitest';
import { HostInput } from '../host-input.ts';

describe('HostInput Implementation for Desktop Runner', () => {
  it('subscribes and forwards pointer move events', () => {
    const input = new HostInput();
    const onMove = vi.fn();
    const unsubscribe = input.subscribe({
      onPointerMove: onMove,
      onPointerDown: vi.fn(),
      onPointerLeave: vi.fn(),
      onVisibilityChange: vi.fn(),
    });

    input.emitPointerMove(0.42, 0.58);
    expect(onMove).toHaveBeenCalledWith(0.42, 0.58);

    unsubscribe();
    input.emitPointerMove(0.5, 0.5);
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('forwards pointer down and click events', () => {
    const input = new HostInput();
    const onDown = vi.fn();
    input.subscribe({
      onPointerMove: vi.fn(),
      onPointerDown: onDown,
      onPointerLeave: vi.fn(),
      onVisibilityChange: vi.fn(),
    });

    input.emitPointerDown(0.5, 0.5);
    expect(onDown).toHaveBeenCalledWith(0.5, 0.5);
  });

  it('forwards pointer leave and visibility change events', () => {
    const input = new HostInput();
    const onLeave = vi.fn();
    const onVisibility = vi.fn();

    input.subscribe({
      onPointerMove: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerLeave: onLeave,
      onVisibilityChange: onVisibility,
    });

    input.emitPointerLeave();
    expect(onLeave).toHaveBeenCalledTimes(1);

    input.emitVisibilityChange(false);
    expect(onVisibility).toHaveBeenCalledWith(false);

    input.emitVisibilityChange(true);
    expect(onVisibility).toHaveBeenCalledWith(true);
  });
});
