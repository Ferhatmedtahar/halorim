import { describe, it, expect } from 'vitest';
import { BrowserInput } from '../input/browser.js';
import type { InputHandlers } from '../types.js';

describe('BrowserInput', () => {
  it('normalizes pointer coordinates against element bounding rect', () => {
    let moveCoords: [number, number] | null = null;
    let downCoords: [number, number] | null = null;
    let left = false;

    // Mock HTML element with getBoundingClientRect
    const listeners = new Map<string, (e: unknown) => void>();
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 200,
        height: 100,
      }),
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners.set(type, fn);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    } as unknown as HTMLElement;

    const input = new BrowserInput(mockElement);
    const handlers: InputHandlers = {
      onPointerMove: (x, y) => {
        moveCoords = [x, y];
      },
      onPointerDown: (x, y) => {
        downCoords = [x, y];
      },
      onPointerLeave: () => {
        left = true;
      },
      onVisibilityChange: () => {},
    };

    const unsubscribe = input.subscribe(handlers);

    // Test pointermove at clientX = 200, clientY = 100
    // x = (200 - 100) / 200 = 0.5
    // y = (100 - 50) / 100 = 0.5
    const moveFn = listeners.get('pointermove')!;
    moveFn({ clientX: 200, clientY: 100 });
    expect(moveCoords).toEqual([0.5, 0.5]);

    // Test pointerdown at clientX = 150, clientY = 75
    // x = (150 - 100) / 200 = 0.25
    // y = (75 - 50) / 100 = 0.25
    const downFn = listeners.get('pointerdown')!;
    downFn({ clientX: 150, clientY: 75 });
    expect(downCoords).toEqual([0.25, 0.25]);

    // Test pointerleave
    const leaveFn = listeners.get('pointerleave')!;
    leaveFn({});
    expect(left).toBe(true);

    // Test coordinates clamping
    moveFn({ clientX: 50, clientY: 200 }); // outside bounds
    expect(moveCoords).toEqual([0.0, 1.0]);

    // Unsubscribe removes listeners
    unsubscribe();
    expect(listeners.size).toBe(0);
  });
});
