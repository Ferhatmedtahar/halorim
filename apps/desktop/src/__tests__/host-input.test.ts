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

  it('treats a pointer that stops reporting movement as having left', () => {
    const input = new HostInput();
    const events: string[] = [];
    input.subscribe({
      onPointerMove: () => events.push('move'),
      onPointerDown: () => events.push('down'),
      onPointerLeave: () => events.push('leave'),
      onVisibilityChange: () => {},
    });

    expect(input.checkStale(10_000)).toBe(false); // never moved: nothing to leave
    input.emitPointerMove(0.5, 0.5, 1000);
    expect(input.checkStale(2500)).toBe(false); // still fresh
    expect(input.checkStale(4500)).toBe(true); // frozen for >3s
    expect(input.checkStale(9000)).toBe(false); // leave is emitted only once
    input.emitPointerMove(0.6, 0.5, 9500); // movement resumes
    expect(input.checkStale(10_000)).toBe(false);
    expect(events).toEqual(['move', 'leave', 'move']);
  });
});
