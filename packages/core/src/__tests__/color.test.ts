import { describe, it, expect } from 'vitest';
import {
  parseColorToOklab,
  parseColorToLinearSrgb,
  samplePaletteLinear,
  oklabToLinearSrgb,
  srgbToLinear,
  linearToSrgb,
} from '../color/oklch.js';

describe('color utilities', () => {
  it('converts between sRGB and Linear sRGB accurately', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBe(1);
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1)).toBe(1);

    const mid = srgbToLinear(0.5);
    expect(linearToSrgb(mid)).toBeCloseTo(0.5, 4);
  });

  it('parses hex colors into OKLab and Linear sRGB', () => {
    const black = parseColorToLinearSrgb('#000000');
    expect(black[0]).toBe(0);
    expect(black[1]).toBe(0);
    expect(black[2]).toBe(0);
    expect(black[3]).toBe(1);

    const white = parseColorToLinearSrgb('#ffffff');
    expect(white[0]).toBeCloseTo(1, 4);
    expect(white[1]).toBeCloseTo(1, 4);
    expect(white[2]).toBeCloseTo(1, 4);
  });

  it('parses OKLCH colors correctly', () => {
    const oklab = parseColorToOklab('oklch(0.75 0.2 350)');
    expect(oklab.L).toBeCloseTo(0.75, 4);
    expect(oklab.alpha).toBe(1.0);

    const linear = parseColorToLinearSrgb('oklch(0.75 0.2 350)');
    expect(linear[0]).toBeGreaterThan(0);
    expect(linear[1]).toBeGreaterThanOrEqual(0);
    expect(linear[2]).toBeGreaterThanOrEqual(0);
  });

  it('converts OKLab directly to Linear sRGB', () => {
    const [r, g, b] = oklabToLinearSrgb(1.0, 0, 0);
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(1, 2);
    expect(b).toBeCloseTo(1, 2);
  });

  it('interpolates smoothly in OKLab across palette stops', () => {
    const stops = [
      parseColorToOklab('oklch(0.8 0.2 150)'),
      parseColorToOklab('oklch(0.7 0.2 290)'),
    ];

    const c0 = samplePaletteLinear(stops, 0.0);
    const cMid = samplePaletteLinear(stops, 0.5);
    const c1 = samplePaletteLinear(stops, 1.0);

    // At 0 and 1, values match respective ends
    expect(c0[0]).toBeCloseTo(c1[0], 2);
    // Interpolated values stay within [0, 1] bounds without NaN
    expect(cMid[0]).toBeGreaterThanOrEqual(0);
    expect(cMid[0]).toBeLessThanOrEqual(1);
    expect(cMid[1]).toBeGreaterThanOrEqual(0);
    expect(cMid[1]).toBeLessThanOrEqual(1);
    expect(cMid[2]).toBeGreaterThanOrEqual(0);
    expect(cMid[2]).toBeLessThanOrEqual(1);
  });
});
