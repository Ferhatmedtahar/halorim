import { describe, it, expect } from 'vitest';
import {
  createPaletteSprings,
  setSpringTargetsImmediate,
  setSpringTargets,
  stepPaletteSprings,
  generateRandomPalette,
} from '../color/spring.js';
import { parseColorToOklab } from '../color/oklch.js';

describe('Spring physics in OKLab', () => {
  it('initializes and immediately snaps targets when requested', () => {
    const springs = createPaletteSprings(2);
    const stops = [
      parseColorToOklab('oklch(0.8 0.2 150)'),
      parseColorToOklab('oklch(0.7 0.2 290)'),
    ];

    setSpringTargetsImmediate(springs, stops);
    expect(springs[0]!.L).toBeCloseTo(0.8, 3);
    expect(springs[0]!.targetL).toBeCloseTo(0.8, 3);
    expect(springs[0]!.vL).toBe(0);
    expect(springs[1]!.L).toBeCloseTo(0.7, 3);
  });

  it('converges smoothly toward target without overshoot (critically damped)', () => {
    const springs = createPaletteSprings(1);
    const start = [parseColorToOklab('oklch(0.5 0.1 100)')];
    const target = [parseColorToOklab('oklch(0.9 0.2 200)')];

    setSpringTargetsImmediate(springs, start);
    setSpringTargets(springs, target);

    let maxL = springs[0]!.L;
    // Step 60 frames (1 second at 60fps)
    for (let i = 0; i < 60; i++) {
      stepPaletteSprings(springs, 1, 1 / 60);
      if (springs[0]!.L > maxL) {
        maxL = springs[0]!.L;
      }
    }

    // Critically damped spring should never overshoot target L
    expect(maxL).toBeLessThanOrEqual(target[0]!.L + 0.001);
    // After 1 second, it should have converged to within 1% of target
    expect(springs[0]!.L).toBeCloseTo(target[0]!.L, 2);
  });

  it('smoothly redirects momentum on rapid target changes', () => {
    const springs = createPaletteSprings(1);
    const c1 = [parseColorToOklab('oklch(0.5 0.1 100)')];
    const c2 = [parseColorToOklab('oklch(0.9 0.2 200)')];
    const c3 = [parseColorToOklab('oklch(0.6 0.15 300)')];

    setSpringTargetsImmediate(springs, c1);
    setSpringTargets(springs, c2);

    // Step 5 frames towards c2
    for (let i = 0; i < 5; i++) {
      stepPaletteSprings(springs, 1, 1 / 60);
    }
    const velMid = springs[0]!.vL;
    expect(velMid).toBeGreaterThan(0);

    // Rapid click: switch target to c3 immediately
    setSpringTargets(springs, c3);
    expect(springs[0]!.targetL).toBeCloseTo(c3[0]!.L, 3);

    // Continue stepping: should settle at c3
    for (let i = 0; i < 60; i++) {
      stepPaletteSprings(springs, 1, 1 / 60);
    }
    expect(springs[0]!.L).toBeCloseTo(c3[0]!.L, 2);
  });

  it('generates valid harmonious random palettes deterministically when seeded', () => {
    const pal1 = generateRandomPalette(42);
    const pal2 = generateRandomPalette(42);

    expect(pal1.length).toBe(4);
    expect(pal1[0]!.L).toBe(pal2[0]!.L);
    expect(pal1[0]!.a).toBe(pal2[0]!.a);
    expect(pal1[0]!.b).toBe(pal2[0]!.b);

    for (const stop of pal1) {
      expect(stop.L).toBeGreaterThan(0.5);
      expect(stop.L).toBeLessThan(1.0);
      expect(stop.alpha).toBe(1.0);
    }
  });
});
