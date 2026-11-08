import type { Shape } from '@glowframe/schema';
import { rasterizeShape } from './rasterize.js';
import { computeSdf, type SdfData } from './edt.js';
import { computeSdfAsync } from './worker.js';

export interface ShapePipelineResult {
  readonly sdf: SdfData;
  readonly shape: Shape;
  readonly hitTest: (u: number, v: number) => number; // returns signed distance in pixels
}

/**
 * Synchronous shape -> mask -> distance field pipeline.
 */
export function buildShapePipeline(
  shape: Shape,
  gridSize: number = 1024,
  maxDistance: number = 96,
): ShapePipelineResult {
  const rasterized = rasterizeShape(shape, gridSize, gridSize);
  const sdf = computeSdf(rasterized.mask, gridSize, gridSize, maxDistance);

  const hitTest = (u: number, v: number): number => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return maxDistance;
    }
    const px = Math.min(gridSize - 1, Math.max(0, Math.floor(u * gridSize)));
    const py = Math.min(gridSize - 1, Math.max(0, Math.floor(v * gridSize)));
    return sdf.cpuDistances[py * gridSize + px]!;
  };

  return {
    sdf,
    shape,
    hitTest,
  };
}

/**
 * Asynchronous shape pipeline offloading Felzenszwalb EDT to a Web Worker.
 * Ensures the main UI thread never blocks during shape computation.
 */
export async function buildShapePipelineAsync(
  shape: Shape,
  gridSize: number = 1024,
  maxDistance: number = 96,
): Promise<ShapePipelineResult> {
  const rasterized = rasterizeShape(shape, gridSize, gridSize);
  const sdf = await computeSdfAsync(rasterized.mask, gridSize, gridSize, maxDistance);

  const hitTest = (u: number, v: number): number => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return maxDistance;
    }
    const px = Math.min(gridSize - 1, Math.max(0, Math.floor(u * gridSize)));
    const py = Math.min(gridSize - 1, Math.max(0, Math.floor(v * gridSize)));
    return sdf.cpuDistances[py * gridSize + px]!;
  };

  return {
    sdf,
    shape,
    hitTest,
  };
}
