import { describe, it, expect } from 'vitest';
import { buildShapePipeline } from '../shape/pipeline.js';
import type { Shape } from '@glowframe/schema';

describe('CPU distance hit testing', () => {
  const triangleShape: Shape = {
    type: 'preset',
    preset: 'triangle',
    position: [0.5, 0.5],
    scale: 0.3,
    rotation: 0,
  };

  const pipeline = buildShapePipeline(triangleShape, 512, 64);

  it('detects interior points as negative distance (d < 0)', () => {
    // Shape centroid is [0.5, 0.5]
    const d = pipeline.hitTest(0.5, 0.5);
    expect(d).toBeLessThan(0);
  });

  it('detects exterior points as positive distance (d > 0)', () => {
    // Corner far outside triangle
    const d = pipeline.hitTest(0.1, 0.1);
    expect(d).toBeGreaterThan(0);
  });

  it('measures near-zero distance at triangle perimeter (d ≈ 0)', () => {
    // The base of the equilateral triangle (size 0.7) has Y = 0.5 + (1/3)*h
    // h = 0.7 * (sqrt(3)/2) = 0.6062
    // base Y = 0.5 + 0.202 = 0.702
    // X at midpoint of base = 0.5
    const dBase = pipeline.hitTest(0.5, 0.702);
    expect(Math.abs(dBase)).toBeLessThan(5); // within 5 pixels on a 512 grid
  });

  it('respects out of bounds coordinates', () => {
    expect(pipeline.hitTest(-0.2, 0.5)).toBeGreaterThan(0);
    expect(pipeline.hitTest(1.2, 0.5)).toBeGreaterThan(0);
  });
});
