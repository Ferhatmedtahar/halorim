import type { Shape } from '@glowframe/schema';
import { AssetLoadError } from '../errors.js';
import { rasterizeShape } from './rasterize.js';
import { computeSdf, type SdfData } from './edt.js';
import { computeSdfAsync } from './worker.js';
import {
  buildVectorSdf,
  flattenPathAdaptive,
  parseSvgDocument,
  IDENTITY,
  type VectorGroup,
} from './vector.js';

export interface ShapePipelineResult {
  readonly sdf: SdfData;
  readonly shape: Shape;
  readonly hitTest: (u: number, v: number) => number; // returns signed distance in pixels
  /** Like hitTest, but against the sealed outer envelope: holes and gaps inside the logo count as inside. */
  readonly hitTestEnvelope: (u: number, v: number) => number;
  /**
   * Interleaved [trueDistance, envelopeDistance] pairs in grid units, uploaded as an RG16F texture.
   * The envelope seals gaps/holes/notches so soft glow never appears inside empty space.
   */
  readonly rgData: Float32Array;
}

/**
 * Resolves SVG-based shapes into polygon groups for the exact vector pipeline.
 * Returns null for shapes that use the raster pipeline (presets, text).
 */
export function vectorGroupsForShape(shape: Shape): VectorGroup[] | null {
  if (shape.type === 'svg-path') {
    if (!shape.d || shape.d.trim().length === 0) {
      throw new AssetLoadError('SVG path "d" attribute must not be empty');
    }
    return [{ polys: flattenPathAdaptive(shape.d, IDENTITY), fillRule: 'nonzero' }];
  }

  if (shape.type === 'svg-file') {
    if (!shape.asset || shape.asset.trim().length === 0) {
      throw new AssetLoadError('SVG file asset must not be empty');
    }
    const asset = shape.asset.trim();
    if (!asset.includes('<')) {
      // Bare path data supplied as the asset.
      return [{ polys: flattenPathAdaptive(asset, IDENTITY), fillRule: 'nonzero' }];
    }
    const items = parseSvgDocument(asset);
    const groups: VectorGroup[] = [];
    for (const item of items) {
      const polys = flattenPathAdaptive(item.d, item.matrix);
      if (polys.length > 0) groups.push({ polys, fillRule: item.fillRule });
    }
    if (groups.length === 0) {
      throw new AssetLoadError(
        'Failed to parse SVG: no filled shapes found. Strokes-only icons must be converted to outlines.',
      );
    }
    return groups;
  }

  return null;
}

function solidShape(shape: Shape): boolean {
  return (shape.type === 'svg-path' || shape.type === 'svg-file') && shape.fillHoles === true;
}

function closeRadius(shape: Shape): number | undefined {
  return shape.type === 'svg-path' || shape.type === 'svg-file' ? shape.closeGaps : undefined;
}

function interleave(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length * 2);
  for (let i = 0; i < a.length; i++) {
    out[i * 2] = a[i]!;
    out[i * 2 + 1] = b[i]!;
  }
  return out;
}

/** True artwork distance + (optional) sealed outer-envelope distance for SVG shapes. */
function buildVectorFields(
  shape: Shape,
  groups: VectorGroup[],
  gridSize: number,
  maxDistance: number,
): { sdf: SdfData; env: SdfData; rgData: Float32Array } {
  const sdf = buildVectorSdf(groups, gridSize, maxDistance, solidShape(shape), 0);
  const close = closeRadius(shape);
  const env =
    close === undefined ? sdf : buildVectorSdf(groups, gridSize, maxDistance, true, close);
  return { sdf, env, rgData: interleave(sdf.floatData, env.floatData) };
}

function makeHitTest(
  sdf: SdfData,
  gridSize: number,
  maxDistance: number,
): (u: number, v: number) => number {
  return (u: number, v: number): number => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return maxDistance;
    }
    const px = Math.min(gridSize - 1, Math.max(0, Math.floor(u * gridSize)));
    const py = Math.min(gridSize - 1, Math.max(0, Math.floor(v * gridSize)));
    return sdf.cpuDistances[py * gridSize + px]!;
  };
}

/**
 * Synchronous shape -> distance field pipeline.
 * SVG shapes use exact vector geometry; presets and text use the raster mask + EDT.
 */
export function buildShapePipeline(
  shape: Shape,
  gridSize: number = 1024,
  maxDistance: number = 256,
): ShapePipelineResult {
  const groups = vectorGroupsForShape(shape);
  let sdf: SdfData;
  let env: SdfData;
  let rgData: Float32Array;
  if (groups) {
    ({ sdf, env, rgData } = buildVectorFields(shape, groups, gridSize, maxDistance));
  } else {
    const rasterized = rasterizeShape(shape, gridSize, gridSize);
    sdf = computeSdf(rasterized.mask, gridSize, gridSize, maxDistance);
    env = sdf;
    rgData = interleave(sdf.floatData, sdf.floatData);
  }
  return {
    sdf,
    shape,
    hitTest: makeHitTest(sdf, gridSize, maxDistance),
    hitTestEnvelope: makeHitTest(env, gridSize, maxDistance),
    rgData,
  };
}

/**
 * Asynchronous shape pipeline. Raster shapes offload the EDT to a Web Worker.
 */
export async function buildShapePipelineAsync(
  shape: Shape,
  gridSize: number = 1024,
  maxDistance: number = 256,
): Promise<ShapePipelineResult> {
  const groups = vectorGroupsForShape(shape);
  let sdf: SdfData;
  let env: SdfData;
  let rgData: Float32Array;
  if (groups) {
    ({ sdf, env, rgData } = buildVectorFields(shape, groups, gridSize, maxDistance));
  } else {
    const rasterized = rasterizeShape(shape, gridSize, gridSize);
    sdf = await computeSdfAsync(rasterized.mask, gridSize, gridSize, maxDistance);
    env = sdf;
    rgData = interleave(sdf.floatData, sdf.floatData);
  }
  return {
    sdf,
    shape,
    hitTest: makeHitTest(sdf, gridSize, maxDistance),
    hitTestEnvelope: makeHitTest(env, gridSize, maxDistance),
    rgData,
  };
}
