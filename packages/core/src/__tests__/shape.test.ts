import { describe, it, expect } from 'vitest';
import { getTriangleVertices, rasterizePolygon } from '../shape/rasterize.js';
import { computeSdf } from '../shape/edt.js';
import { buildShapePipeline } from '../shape/pipeline.js';
import type { Shape } from '@glowframe/schema';

describe('shape pipeline & Euclidean Distance Transform', () => {
  it('generates symmetric equilateral triangle vertices centered at (0.5, 0.5)', () => {
    const verts = getTriangleVertices(0.7);
    expect(verts.length).toBe(3);
    const [top, right, left] = verts as [[number, number], [number, number], [number, number]];

    // Top apex is horizontally centered
    expect(top[0]).toBeCloseTo(0.5, 4);
    // Base is horizontally balanced
    expect(left[0] + (right[0] - left[0]) / 2).toBeCloseTo(0.5, 4);
    // Base points share same Y
    expect(left[1]).toBeCloseTo(right[1], 4);
  });

  it('rasterizes triangle into a binary mask with positive area', () => {
    const verts = getTriangleVertices(0.7);
    const { mask, width, height } = rasterizePolygon(verts, 256, 256);

    // Center pixel (0.5, 0.5) must be inside the triangle
    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    expect(mask[centerIdx]).toBe(1);

    // Top-left corner (0.05, 0.05) must be outside
    const cornerIdx = Math.floor(0.05 * height) * width + Math.floor(0.05 * width);
    expect(mask[cornerIdx]).toBe(0);

    let insideCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) insideCount++;
    }
    expect(insideCount).toBeGreaterThan(5000);
    expect(insideCount).toBeLessThan(256 * 256);
  });

  it('computes exact signed distance field with negative values inside and positive values outside', () => {
    const verts = getTriangleVertices(0.7);
    const { mask, width, height } = rasterizePolygon(verts, 256, 256);
    const maxDist = 32;
    const sdf = computeSdf(mask, width, height, maxDist);

    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    const cornerIdx = Math.floor(0.05 * height) * width + Math.floor(0.05 * width);

    // Inside: negative distance
    expect(sdf.cpuDistances[centerIdx]).toBeLessThan(0);
    // Outside: positive distance
    expect(sdf.cpuDistances[cornerIdx]).toBeGreaterThan(0);

    // R8 normalization:
    // Inside center is < 128
    expect(sdf.r8Data[centerIdx]).toBeLessThan(128);
    // Outside corner is clamped to 255
    expect(sdf.r8Data[cornerIdx]).toBe(255);
  });

  it('hit-tests coordinates accurately against CPU distance field', () => {
    const triangleShape: Shape = {
      type: 'preset',
      preset: 'triangle',
      position: [0.5, 0.5],
      scale: 0.3,
      rotation: 0,
    };

    const pipeline = buildShapePipeline(triangleShape, 256, 32);

    // Center of shape is inside (distance < 0)
    expect(pipeline.hitTest(0.5, 0.5)).toBeLessThan(0);

    // Far outside is positive (distance > 0)
    expect(pipeline.hitTest(0.05, 0.05)).toBeGreaterThan(0);

    // Out-of-bounds coordinates return positive distance
    expect(pipeline.hitTest(-1, 0.5)).toBeGreaterThan(0);
    expect(pipeline.hitTest(0.5, 2.0)).toBeGreaterThan(0);
  });
});
