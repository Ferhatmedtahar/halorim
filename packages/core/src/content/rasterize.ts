import type { CenterContent } from '@glowframe/schema';
import { parseColorToLinearSrgb } from '../color/oklch.js';
import { parseSvgString } from '../shape/rasterize.js';

export interface ContentTextureResult {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array; // RGBA pixels
  readonly tint: [number, number, number, number]; // [r, g, b, hasTint]
  readonly scale: number;
  readonly opacity: number;
}

export function rasterizeCenterContent(
  content: CenterContent | null,
  size: number = 512,
): ContentTextureResult {
  if (!content) {
    const emptyData = new Uint8Array(4); // 1 transparent pixel
    return {
      width: 1,
      height: 1,
      data: emptyData,
      tint: [1, 1, 1, 0],
      scale: 0.6,
      opacity: 0,
    };
  }

  let tintRgb: [number, number, number, number] = [1, 1, 1, 0];
  if (content.tint) {
    const srgb = parseColorToLinearSrgb(content.tint);
    tintRgb = [srgb[0], srgb[1], srgb[2], 1.0];
  }

  const scale = content.scale ?? 0.6;
  const opacity = content.opacity ?? 1.0;

  let canvas: unknown = null;
  let ctx: CanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    const offCanvas = new OffscreenCanvas(size, size);
    ctx = offCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    canvas = offCanvas;
  } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const domCanvas = document.createElement('canvas');
    domCanvas.width = size;
    domCanvas.height = size;
    ctx = domCanvas.getContext('2d');
    canvas = domCanvas;
  }

  if (!canvas || !ctx) {
    // Fallback in pure Node: 4x4 white box
    const fallbackData = new Uint8Array(16 * 4);
    fallbackData.fill(255);
    return {
      width: 4,
      height: 4,
      data: fallbackData,
      tint: tintRgb,
      scale,
      opacity,
    };
  }

  ctx.clearRect(0, 0, size, size);

  if (content.type === 'text') {
    const fontSize = Math.floor(size * 0.4);
    ctx.font = `${fontSize}px ${content.fontFamily ?? 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(content.text, size / 2, size / 2);
  } else if (content.type === 'svg') {
    try {
      const { viewBox, paths } = parseSvgString(content.asset);
      const [minX, minY, vbWidth, vbHeight] = viewBox;
      const targetSize = size * 0.8;
      const svgScale = Math.min(targetSize / vbWidth, targetSize / vbHeight);
      const offsetX = (size - vbWidth * svgScale) / 2 - minX * svgScale;
      const offsetY = (size - vbHeight * svgScale) / 2 - minY * svgScale;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(svgScale, svgScale);
      ctx.fillStyle = '#ffffff';
      for (const d of paths) {
        ctx.fill(new Path2D(d));
      }
      ctx.restore();
    } catch {
      // Graceful fallback for unparsed SVG
    }
  }

  const imgData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imgData.data.buffer),
    tint: tintRgb,
    scale,
    opacity,
  };
}
