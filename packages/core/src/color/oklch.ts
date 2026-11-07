/**
 * High-performance color conversion between OKLCH, OKLab, Linear sRGB, and sRGB.
 * Zero per-frame allocations when using pre-allocated target buffers.
 */

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorOKLab {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

/**
 * Converts sRGB [0..1] gamma-encoded component to Linear sRGB [0..1].
 */
export function srgbToLinear(c: number): number {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear sRGB [0..1] component to sRGB [0..1] gamma-encoded.
 */
export function linearToSrgb(c: number): number {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}

/**
 * Converts OKLab coordinates to Linear sRGB [r, g, b].
 */
export function oklabToLinearSrgb(
  L: number,
  a: number,
  b: number,
  out?: [number, number, number],
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767434729 * l - 3.3077115913 * m + 0.2309699291 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const target = out ?? [0, 0, 0];
  target[0] = Math.max(0, Math.min(1, r));
  target[1] = Math.max(0, Math.min(1, g));
  target[2] = Math.max(0, Math.min(1, bl));
  return target;
}

/**
 * Converts Linear sRGB [r, g, b] to OKLab [L, a, b].
 */
export function linearSrgbToOklab(
  r: number,
  g: number,
  b: number,
  out?: [number, number, number],
): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a_ = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const target = out ?? [0, 0, 0];
  target[0] = L;
  target[1] = a_;
  target[2] = b_;
  return target;
}

/**
 * Converts OKLCH (L in 0..1, C in 0..0.4+, H in 0..360 deg) to OKLab.
 */
export function oklchToOklab(
  L: number,
  C: number,
  H: number,
  out?: [number, number, number],
): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const target = out ?? [0, 0, 0];
  target[0] = L;
  target[1] = a;
  target[2] = b;
  return target;
}

/**
 * Parses any CSS color string (oklch, hex, rgb) into OKLab coordinates.
 */
export function parseColorToOklab(colorStr: string): ColorOKLab {
  const str = colorStr.trim().toLowerCase();

  // 1. oklch(L C H [/ A])
  const oklchMatch = str.match(
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/,
  );
  if (oklchMatch) {
    const rawL = parseFloat(oklchMatch[1]!);
    const isLPercent = oklchMatch[2] === '%';
    const L = isLPercent ? rawL / 100 : rawL;
    const C = parseFloat(oklchMatch[3]!);
    const H = parseFloat(oklchMatch[4]!);
    const alphaStr = oklchMatch[5];
    const alpha =
      alphaStr !== undefined
        ? oklchMatch[6] === '%'
          ? parseFloat(alphaStr) / 100
          : parseFloat(alphaStr)
        : 1.0;

    const [labL, a, b] = oklchToOklab(L, C, H);
    return { L: labL, a, b, alpha };
  }

  // 2. Hex #rgb, #rgba, #rrggbb, #rrggbbaa
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    let r = 0,
      g = 0,
      b = 0,
      a = 1.0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0]! + hex[0]!, 16) / 255;
      g = parseInt(hex[1]! + hex[1]!, 16) / 255;
      b = parseInt(hex[2]! + hex[2]!, 16) / 255;
      if (hex.length === 4) a = parseInt(hex[3]! + hex[3]!, 16) / 255;
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
      if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
    }
    const linR = srgbToLinear(r);
    const linG = srgbToLinear(g);
    const linB = srgbToLinear(b);
    const [labL, labA, labB] = linearSrgbToOklab(linR, linG, linB);
    return { L: labL, a: labA, b: labB, alpha: a };
  }

  // 3. rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgbMatch) {
    const r = parseFloat(rgbMatch[1]!) / 255;
    const g = parseFloat(rgbMatch[2]!) / 255;
    const b = parseFloat(rgbMatch[3]!) / 255;
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1.0;
    const linR = srgbToLinear(r);
    const linG = srgbToLinear(g);
    const linB = srgbToLinear(b);
    const [labL, labA, labB] = linearSrgbToOklab(linR, linG, linB);
    return { L: labL, a: labA, b: labB, alpha: a };
  }

  // Default fallback: white
  return { L: 1.0, a: 0.0, b: 0.0, alpha: 1.0 };
}

/**
 * Parses any CSS color string directly to Linear sRGB [r, g, b, a].
 */
export function parseColorToLinearSrgb(colorStr: string): [number, number, number, number] {
  const oklab = parseColorToOklab(colorStr);
  const [r, g, b] = oklabToLinearSrgb(oklab.L, oklab.a, oklab.b);
  return [r, g, b, oklab.alpha];
}

/**
 * Samples a color along a palette at normalized position t in [0..1] with interpolation in OKLab.
 * Outputs [r, g, b, a] in Linear sRGB.
 */
export function samplePaletteLinear(
  paletteOklab: readonly ColorOKLab[],
  t: number,
  out?: [number, number, number, number],
): [number, number, number, number] {
  const target = out ?? [0, 0, 0, 1];
  const count = paletteOklab.length;
  if (count === 0) {
    target[0] = 1;
    target[1] = 1;
    target[2] = 1;
    target[3] = 1;
    return target;
  }
  if (count === 1) {
    const c = paletteOklab[0]!;
    const [r, g, b] = oklabToLinearSrgb(c.L, c.a, c.b);
    target[0] = r;
    target[1] = g;
    target[2] = b;
    target[3] = c.alpha;
    return target;
  }

  // Wrap t into [0, 1)
  const normT = ((t % 1) + 1) % 1;
  const scaled = normT * count;
  const idx0 = Math.floor(scaled) % count;
  const idx1 = (idx0 + 1) % count;
  const frac = scaled - Math.floor(scaled);

  const c0 = paletteOklab[idx0]!;
  const c1 = paletteOklab[idx1]!;

  // Smooth interpolation in OKLab
  const L = c0.L + frac * (c1.L - c0.L);
  const a = c0.a + frac * (c1.a - c0.a);
  const b = c0.b + frac * (c1.b - c0.b);
  const alpha = c0.alpha + frac * (c1.alpha - c0.alpha);

  const [r, g, bl] = oklabToLinearSrgb(L, a, b);
  target[0] = r;
  target[1] = g;
  target[2] = bl;
  target[3] = alpha;
  return target;
}
