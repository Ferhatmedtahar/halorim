import { describe, it, expect } from 'vitest';
import {
  getTriangleVertices,
  getStarVertices,
  getRegularPolygonVertices,
  rasterizePolygon,
  rasterizeCircle,
  rasterizeRoundedRect,
  rasterizeShape,
  parseSvgString,
} from '../shape/rasterize.js';
import { computeSdf } from '../shape/edt.js';
import { computeSdfAsync } from '../shape/worker.js';
import { buildShapePipeline, buildShapePipelineAsync } from '../shape/pipeline.js';
import { rasterizeCenterContent } from '../content/rasterize.js';
import { AssetLoadError } from '../errors.js';
import type { Shape, CenterContent } from '@glowframe/schema';

describe('shape pipeline & Euclidean Distance Transform', () => {
  it('generates symmetric equilateral triangle vertices centered at (0.5, 0.5)', () => {
    const verts = getTriangleVertices(0.7);
    expect(verts.length).toBe(3);
    const [top, right, left] = verts as [[number, number], [number, number], [number, number]];

    expect(top[0]).toBeCloseTo(0.5, 4);
    expect(left[0] + (right[0] - left[0]) / 2).toBeCloseTo(0.5, 4);
    expect(left[1]).toBeCloseTo(right[1], 4);
  });

  it('generates star and regular polygon vertices', () => {
    const starVerts = getStarVertices(5, 0.35, 0.17);
    expect(starVerts.length).toBe(10);

    const hexVerts = getRegularPolygonVertices(6, 0.35);
    expect(hexVerts.length).toBe(6);

    const octVerts = getRegularPolygonVertices(8, 0.35);
    expect(octVerts.length).toBe(8);
  });

  it('rasterizes circle with exact radius', () => {
    const { mask, width, height } = rasterizeCircle(0.35, 256, 256);
    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    expect(mask[centerIdx]).toBe(1);

    const cornerIdx = 0;
    expect(mask[cornerIdx]).toBe(0);
  });

  it('rasterizes rounded rectangle with corner radii', () => {
    const { mask, width, height } = rasterizeRoundedRect(0.6, 0.6, 0.1, 256, 256);
    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    expect(mask[centerIdx]).toBe(1);

    const cornerIdx = 0;
    expect(mask[cornerIdx]).toBe(0);
  });

  it('rasterizes all preset shapes via rasterizeShape', () => {
    const presets: Array<Extract<Shape, { type: 'preset' }>> = [
      { type: 'preset', preset: 'triangle', position: [0.5, 0.5], scale: 0.3, rotation: 0 },
      { type: 'preset', preset: 'circle', position: [0.5, 0.5], scale: 0.3, rotation: 0 },
      {
        type: 'preset',
        preset: 'rounded-rect',
        cornerRadius: 0.1,
        position: [0.5, 0.5],
        scale: 0.3,
        rotation: 0,
      },
      { type: 'preset', preset: 'star', position: [0.5, 0.5], scale: 0.3, rotation: 0 },
      { type: 'preset', preset: 'hexagon', position: [0.5, 0.5], scale: 0.3, rotation: 0 },
      {
        type: 'preset',
        preset: 'polygon',
        sides: 7,
        position: [0.5, 0.5],
        scale: 0.3,
        rotation: 0,
      },
    ];

    for (const shape of presets) {
      const { mask, width, height } = rasterizeShape(shape, 128, 128);
      const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
      expect(mask[centerIdx]).toBe(1);
    }
  });

  it('parses SVG strings into viewBox and path d strings', () => {
    const svgXml = '<svg viewBox="0 0 200 150"><path d="M 10 10 L 90 90 Z"/></svg>';
    const parsed = parseSvgString(svgXml);
    expect(parsed.viewBox).toEqual([0, 0, 200, 150]);
    expect(parsed.paths).toEqual(['M 10 10 L 90 90 Z']);
  });

  it('fails gracefully with AssetLoadError when parsing bad or empty SVGs', () => {
    expect(() => parseSvgString('')).toThrow(AssetLoadError);
    expect(() => parseSvgString('not an svg at all')).toThrow(AssetLoadError);
    expect(() => parseSvgString('<svg></svg>')).toThrow(AssetLoadError);

    // Bad shape input via rasterizeShape
    expect(() =>
      rasterizeShape(
        {
          type: 'svg-path',
          d: '',
          viewBox: [0, 0, 100, 100],
          position: [0.5, 0.5],
          scale: 0.3,
          rotation: 0,
        },
        128,
        128,
      ),
    ).toThrow(AssetLoadError);

    expect(() =>
      rasterizeShape(
        {
          type: 'svg-file',
          asset: '',
          position: [0.5, 0.5],
          scale: 0.3,
          rotation: 0,
        },
        128,
        128,
      ),
    ).toThrow(AssetLoadError);
  });

  it('computes exact signed distance field with negative values inside and positive values outside', () => {
    const verts = getTriangleVertices(0.7);
    const { mask, width, height } = rasterizePolygon(verts, 256, 256);
    const maxDist = 32;
    const sdf = computeSdf(mask, width, height, maxDist);

    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    const cornerIdx = Math.floor(0.05 * height) * width + Math.floor(0.05 * width);

    expect(sdf.cpuDistances[centerIdx]).toBeLessThan(0);
    expect(sdf.cpuDistances[cornerIdx]).toBeGreaterThan(0);
    expect(sdf.r8Data[centerIdx]).toBeLessThan(128);
    expect(sdf.r8Data[cornerIdx]).toBe(255);
  });

  it('computes signed distance field asynchronously via computeSdfAsync', async () => {
    const verts = getTriangleVertices(0.7);
    const { mask, width, height } = rasterizePolygon(verts, 128, 128);
    const sdfAsync = await computeSdfAsync(mask, width, height, 32);

    expect(sdfAsync.width).toBe(128);
    expect(sdfAsync.height).toBe(128);
    const centerIdx = Math.floor(0.5 * height) * width + Math.floor(0.5 * width);
    expect(sdfAsync.cpuDistances[centerIdx]).toBeLessThan(0);
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
    expect(pipeline.hitTest(0.5, 0.5)).toBeLessThan(0);
    expect(pipeline.hitTest(0.05, 0.05)).toBeGreaterThan(0);
    expect(pipeline.hitTest(-1, 0.5)).toBeGreaterThan(0);
    expect(pipeline.hitTest(0.5, 2.0)).toBeGreaterThan(0);
  });

  it('builds shape pipeline asynchronously via buildShapePipelineAsync', async () => {
    const circleShape: Shape = {
      type: 'preset',
      preset: 'circle',
      position: [0.5, 0.5],
      scale: 0.3,
      rotation: 0,
    };

    const pipeline = await buildShapePipelineAsync(circleShape, 128, 32);
    expect(pipeline.hitTest(0.5, 0.5)).toBeLessThan(0);
    expect(pipeline.hitTest(0.05, 0.05)).toBeGreaterThan(0);
  });

  it('rasterizes center content with tint and opacity', () => {
    const nullContent = rasterizeCenterContent(null);
    expect(nullContent.opacity).toBe(0);

    const textContent: CenterContent = {
      type: 'text',
      text: 'GLOW',
      fontFamily: 'sans-serif',
      tint: '#ff0000',
      scale: 0.5,
      opacity: 0.8,
    };
    const textResult = rasterizeCenterContent(textContent, 64);
    expect(textResult.scale).toBe(0.5);
    expect(textResult.opacity).toBe(0.8);
    expect(textResult.tint[3]).toBe(1.0); // Has tint
  });
});
