import type { Shape } from '@glowframe/schema';

export interface RasterizedMask {
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8Array; // 1 = inside, 0 = outside
}

/**
 * Creates an equilateral triangle centered at its centroid (0.5, 0.5).
 */
export function getTriangleVertices(size: number = 0.7): [number, number][] {
  const h = size * (Math.sqrt(3) / 2);
  const topY = 0.5 - (2 / 3) * h;
  const bottomY = 0.5 + (1 / 3) * h;
  const leftX = 0.5 - size / 2;
  const rightX = 0.5 + size / 2;

  return [
    [0.5, topY],
    [rightX, bottomY],
    [leftX, bottomY],
  ];
}

/**
 * Pure geometric scanline rasterizer for convex/simple polygons.
 * Works without requiring any DOM/Canvas APIs, ensuring complete platform independence.
 */
export function rasterizePolygon(
  vertices: readonly [number, number][],
  width: number = 1024,
  height: number = 1024,
): RasterizedMask {
  const mask = new Uint8Array(width * height);
  const n = vertices.length;
  if (n < 3) return { width, height, mask };

  const scaled = vertices.map(([x, y]) => [x * width, y * height] as [number, number]);

  // Point in polygon test via ray casting for each pixel
  for (let y = 0; y < height; y++) {
    const py = y + 0.5;
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = scaled[i]![0];
        const yi = scaled[i]![1];
        const xj = scaled[j]![0];
        const yj = scaled[j]![1];

        const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) {
        mask[y * width + x] = 1;
      }
    }
  }

  return { width, height, mask };
}

/**
 * Rasterizes any supported shape definition into a binary silhouette mask.
 */
export function rasterizeShape(
  shape: Shape,
  width: number = 1024,
  height: number = 1024,
): RasterizedMask {
  if (shape.type === 'preset') {
    if (shape.preset === 'triangle') {
      const verts = getTriangleVertices(0.7);
      return rasterizePolygon(verts, width, height);
    }
    // Hexagon preset fallback
    if (shape.preset === 'hexagon' || shape.preset === 'polygon') {
      const sides = shape.sides ?? 6;
      const radius = 0.35;
      const verts: [number, number][] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        verts.push([0.5 + radius * Math.cos(angle), 0.5 + radius * Math.sin(angle)]);
      }
      return rasterizePolygon(verts, width, height);
    }
  }

  // Default triangle fallback for unhandled shape variants in M2
  const verts = getTriangleVertices(0.7);
  return rasterizePolygon(verts, width, height);
}
