import type { Shape } from '@glowframe/schema';
import { AssetLoadError } from '../errors.js';

export interface RasterizedMask {
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8Array; // 1 = inside, 0 = outside
}

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

export function getStarVertices(
  points: number = 5,
  outerRadius: number = 0.35,
  innerRadius: number = 0.17,
): [number, number][] {
  const vertices: [number, number][] = [];
  const totalPoints = points * 2;
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push([0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)]);
  }
  return vertices;
}

export function getRegularPolygonVertices(
  sides: number = 6,
  radius: number = 0.35,
): [number, number][] {
  const vertices: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    vertices.push([0.5 + radius * Math.cos(angle), 0.5 + radius * Math.sin(angle)]);
  }
  return vertices;
}

/**
 * Geometric scanline rasterizer for polygons.
 * Fully platform-independent: runs in browser, worker, and Node without native canvas dependencies.
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
 * Geometric scanline rasterizer for circles.
 */
export function rasterizeCircle(
  radius: number = 0.35,
  width: number = 1024,
  height: number = 1024,
): RasterizedMask {
  const mask = new Uint8Array(width * height);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const rPx = radius * Math.min(width, height);
  const rSq = rPx * rPx;

  for (let y = 0; y < height; y++) {
    const dy = y + 0.5 - cy;
    const dySq = dy * dy;
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - cx;
      if (dx * dx + dySq <= rSq) {
        mask[y * width + x] = 1;
      }
    }
  }

  return { width, height, mask };
}

/**
 * Geometric scanline rasterizer for rounded rectangles.
 */
export function rasterizeRoundedRect(
  rectWidth: number = 0.65,
  rectHeight: number = 0.65,
  cornerRadius: number = 0.1,
  width: number = 1024,
  height: number = 1024,
): RasterizedMask {
  const mask = new Uint8Array(width * height);
  const halfW = (rectWidth * width) / 2;
  const halfH = (rectHeight * height) / 2;
  const rPx = cornerRadius * Math.min(width, height);
  const cx = width * 0.5;
  const cy = height * 0.5;

  for (let y = 0; y < height; y++) {
    const dy = Math.abs(y + 0.5 - cy);
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x + 0.5 - cx);
      if (dx <= halfW && dy <= halfH) {
        const cornerDx = dx - (halfW - rPx);
        const cornerDy = dy - (halfH - rPx);
        if (cornerDx > 0 && cornerDy > 0) {
          if (cornerDx * cornerDx + cornerDy * cornerDy <= rPx * rPx) {
            mask[y * width + x] = 1;
          }
        } else {
          mask[y * width + x] = 1;
        }
      }
    }
  }

  return { width, height, mask };
}

/**
 * Extracts viewBox and path d strings from an SVG XML string.
 */
export function parseSvgString(svgContent: string): {
  viewBox: [number, number, number, number];
  paths: string[];
} {
  const trimmed = svgContent.trim();
  if (!trimmed || (!trimmed.includes('<svg') && !trimmed.includes('<path'))) {
    throw new AssetLoadError('Invalid SVG content: missing <svg> or <path> elements');
  }

  let viewBox: [number, number, number, number] = [0, 0, 100, 100];
  const vbMatch = trimmed.match(
    /viewBox=["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)["']/i,
  );
  if (vbMatch) {
    const minX = parseFloat(vbMatch[1]!);
    const minY = parseFloat(vbMatch[2]!);
    const w = parseFloat(vbMatch[3]!);
    const h = parseFloat(vbMatch[4]!);
    if (!isNaN(minX) && !isNaN(minY) && w > 0 && h > 0) {
      viewBox = [minX, minY, w, h];
    }
  } else {
    const wMatch = trimmed.match(/width=["']\s*([-\d.]+)\s*(?:px)?["']/i);
    const hMatch = trimmed.match(/height=["']\s*([-\d.]+)\s*(?:px)?["']/i);
    if (wMatch && hMatch) {
      const w = parseFloat(wMatch[1]!);
      const h = parseFloat(hMatch[1]!);
      if (w > 0 && h > 0) {
        viewBox = [0, 0, w, h];
      }
    }
  }

  const paths: string[] = [];
  const pathRegex = /<path[^>]*\bd=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(trimmed)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      paths.push(match[1].trim());
    }
  }

  if (paths.length === 0) {
    const singlePathMatch = trimmed.match(/^M\s*[-\d.]+/i);
    if (singlePathMatch) {
      paths.push(trimmed);
    } else {
      throw new AssetLoadError('Failed to parse SVG: no valid path elements found');
    }
  }

  return { viewBox, paths };
}

/**
 * Creates an offscreen 2D canvas context if available in the current environment.
 */
function create2DCanvas(
  width: number,
  height: number,
): {
  canvas: unknown;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) return { canvas, ctx: ctx as unknown as CanvasRenderingContext2D };
  }

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) return { canvas, ctx };
  }

  return null;
}

/**
 * Rasterizes an SVG path using Canvas 2D Path2D.
 */
function rasterizeSvgPathWithCanvas(
  d: string,
  viewBox: [number, number, number, number],
  width: number,
  height: number,
): RasterizedMask {
  const canvasObj = create2DCanvas(width, height);
  if (!canvasObj) {
    throw new AssetLoadError('Canvas 2D context unavailable for SVG path rasterization');
  }

  const { ctx } = canvasObj;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const [minX, minY, vbWidth, vbHeight] = viewBox;
  if (vbWidth <= 0 || vbHeight <= 0) {
    throw new AssetLoadError(`Invalid viewBox dimensions: ${vbWidth}x${vbHeight}`);
  }

  const targetSize = width * 0.72;
  const scale = Math.min(targetSize / vbWidth, targetSize / vbHeight);
  const offsetX = (width - vbWidth * scale) / 2 - minX * scale;
  const offsetY = (height - vbHeight * scale) / 2 - minY * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  try {
    const path2d = new Path2D(d);
    ctx.fillStyle = '#ffffff';
    ctx.fill(path2d);
  } catch (err) {
    throw new AssetLoadError(
      `Failed to rasterize SVG path: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    ctx.restore();
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    if (pixels[i * 4]! > 128) {
      mask[i] = 1;
    }
  }

  return { width, height, mask };
}

/**
 * Rasterizes text into a binary mask silhouette.
 */
function rasterizeTextWithCanvas(
  text: string,
  fontFamily: string,
  fontWeight: string | undefined,
  width: number,
  height: number,
): RasterizedMask {
  const canvasObj = create2DCanvas(width, height);
  if (!canvasObj) {
    throw new AssetLoadError('Canvas 2D context unavailable for text rasterization');
  }

  const { ctx } = canvasObj;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const weight = fontWeight ? `${fontWeight} ` : '';
  const fontSize = Math.floor(width * 0.4);
  ctx.font = `${weight}${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  ctx.fillText(text, width / 2, height / 2);

  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    if (pixels[i * 4]! > 128) {
      mask[i] = 1;
    }
  }

  return { width, height, mask };
}

/**
 * High-performance rasterizer supporting all shape variants from schema v1:
 * - preset (triangle, hexagon, circle, rounded-rect, star, polygon)
 * - svg-path (Path2D with viewBox normalization)
 * - svg-file (parsed SVG paths)
 * - text (canvas text silhouette)
 */
export function rasterizeShape(
  shape: Shape,
  width: number = 1024,
  height: number = 1024,
): RasterizedMask {
  if (shape.type === 'preset') {
    switch (shape.preset) {
      case 'triangle': {
        const verts = getTriangleVertices(0.7);
        return rasterizePolygon(verts, width, height);
      }
      case 'circle': {
        return rasterizeCircle(0.35, width, height);
      }
      case 'rounded-rect': {
        const radius = shape.cornerRadius ?? 0.1;
        return rasterizeRoundedRect(0.65, 0.65, radius, width, height);
      }
      case 'star': {
        const verts = getStarVertices(5, 0.35, 0.17);
        return rasterizePolygon(verts, width, height);
      }
      case 'hexagon': {
        const verts = getRegularPolygonVertices(6, 0.35);
        return rasterizePolygon(verts, width, height);
      }
      case 'polygon': {
        const sides = shape.sides ?? 6;
        const verts = getRegularPolygonVertices(sides, 0.35);
        return rasterizePolygon(verts, width, height);
      }
    }
  }

  if (shape.type === 'svg-path') {
    if (!shape.d || shape.d.trim().length === 0) {
      throw new AssetLoadError('SVG path "d" attribute must not be empty');
    }
    return rasterizeSvgPathWithCanvas(shape.d, shape.viewBox, width, height);
  }

  if (shape.type === 'svg-file') {
    if (!shape.asset || shape.asset.trim().length === 0) {
      throw new AssetLoadError('SVG file asset must not be empty');
    }
    const { viewBox, paths } = parseSvgString(shape.asset);
    const effectiveViewBox = shape.viewBox ?? viewBox;
    const combinedD = paths.join(' ');
    return rasterizeSvgPathWithCanvas(combinedD, effectiveViewBox, width, height);
  }

  if (shape.type === 'text') {
    if (!shape.text || shape.text.trim().length === 0) {
      throw new AssetLoadError('Text shape must not be empty');
    }
    return rasterizeTextWithCanvas(
      shape.text,
      shape.font ?? 'sans-serif',
      shape.fontWeight,
      width,
      height,
    );
  }

  const verts = getTriangleVertices(0.7);
  return rasterizePolygon(verts, width, height);
}
