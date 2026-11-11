import { AssetLoadError } from '../errors.js';
import { binaryDistances, distanceToFeature, type SdfData } from './edt.js';

/**
 * Pure-geometry vector shape pipeline.
 *
 * SVG data -> flattened polygons -> exact scanline mask -> exact distance to the outline
 * (near the edge) blended into an Euclidean distance transform (far from the edge).
 *
 * No canvas, DOM or worker is needed, so it behaves identically in browsers, workers and Node,
 * and it never suffers from raster stair-stepping: every pixel near the outline stores the true
 * Euclidean distance to the true curve.
 */

export type Mat = readonly [number, number, number, number, number, number];
export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export type FillRule = 'nonzero' | 'evenodd';

export interface VectorGroup {
  /** Each polygon is a flat [x0, y0, x1, y1, ...] list, implicitly closed. */
  readonly polys: number[][];
  readonly fillRule: FillRule;
}

export interface SvgShapeItem {
  readonly d: string;
  readonly matrix: Mat;
  readonly fillRule: FillRule;
}

// ---------------------------------------------------------------------------
// Matrices
// ---------------------------------------------------------------------------

export function mulMat(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function parseTransform(value: string | undefined): Mat {
  if (!value) return IDENTITY;
  let m: Mat = IDENTITY;
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    const name = match[1]!.toLowerCase();
    const a = match[2]!
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number);
    if (a.some((n) => !Number.isFinite(n))) continue;
    let t: Mat | null = null;
    switch (name) {
      case 'matrix':
        if (a.length >= 6) t = [a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!];
        break;
      case 'translate':
        t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case 'scale':
        t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const r = ((a[0] ?? 0) * Math.PI) / 180;
        const c = Math.cos(r);
        const s = Math.sin(r);
        t = [c, s, -s, c, 0, 0];
        if (a.length >= 3) {
          const cx = a[1]!;
          const cy = a[2]!;
          t = mulMat(mulMat([1, 0, 0, 1, cx, cy], t), [1, 0, 0, 1, -cx, -cy]);
        }
        break;
      }
      case 'skewx':
        t = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewy':
        t = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    if (t) m = mulMat(m, t);
  }
  return m;
}

// ---------------------------------------------------------------------------
// SVG path data -> polygons
// ---------------------------------------------------------------------------

const NUM_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

function flattenCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tol: number,
  depth: number,
  out: number[],
): void {
  const dx = x3 - x0;
  const dy = y3 - y0;
  const len = Math.hypot(dx, dy);
  let flat: number;
  if (len < 1e-9) {
    flat = Math.max(Math.hypot(x1 - x0, y1 - y0), Math.hypot(x2 - x0, y2 - y0));
  } else {
    flat = Math.max(
      Math.abs((x1 - x0) * dy - (y1 - y0) * dx),
      Math.abs((x2 - x0) * dy - (y2 - y0) * dx),
    );
    flat /= len;
  }
  if (flat <= tol || depth >= 12) {
    out.push(x3, y3);
    return;
  }
  const x01 = (x0 + x1) / 2;
  const y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2;
  const y23 = (y2 + y3) / 2;
  const xa = (x01 + x12) / 2;
  const ya = (y01 + y12) / 2;
  const xb = (x12 + x23) / 2;
  const yb = (y12 + y23) / 2;
  const xm = (xa + xb) / 2;
  const ym = (ya + yb) / 2;
  flattenCubic(x0, y0, x01, y01, xa, ya, xm, ym, tol, depth + 1, out);
  flattenCubic(xm, ym, xb, yb, x23, y23, x3, y3, tol, depth + 1, out);
}

/**
 * Flattens SVG path data into closed polygons, applying `matrix` to every point.
 * Throws AssetLoadError for malformed data.
 */
export function flattenPath(d: string, matrix: Mat = IDENTITY, tol: number = 0.04): number[][] {
  const polys: number[][] = [];
  let cur: number[] | null = null;

  let i = 0;
  const n = d.length;
  let cx = 0;
  let cy = 0; // current point (local space)
  let sx = 0;
  let sy = 0; // subpath start (local space)
  let lcx = 0;
  let lcy = 0; // last control point (local space) for S/T reflection
  let prevCmd = '';

  const tx = (x: number, y: number): number => matrix[0] * x + matrix[2] * y + matrix[4];
  const ty = (x: number, y: number): number => matrix[1] * x + matrix[3] * y + matrix[5];

  const fail = (msg: string): never => {
    throw new AssetLoadError(`Invalid SVG path data: ${msg}`);
  };
  const skip = (): void => {
    while (i < n) {
      const c = d.charCodeAt(i);
      if (c === 32 || c === 44 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
  };
  const hasNum = (): boolean => {
    skip();
    if (i >= n) return false;
    const c = d[i]!;
    return (c >= '0' && c <= '9') || c === '.' || c === '-' || c === '+';
  };
  const num = (): number => {
    skip();
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(d);
    if (!m) return fail(`expected number at offset ${i}`);
    i = NUM_RE.lastIndex;
    return parseFloat(m[0]);
  };
  const flag = (): number => {
    skip();
    const c = d[i];
    if (c === '0' || c === '1') {
      i++;
      return c === '1' ? 1 : 0;
    }
    return fail(`expected arc flag at offset ${i}`);
  };

  const finish = (): void => {
    if (cur && cur.length >= 6) polys.push(cur);
    cur = null;
  };
  const begin = (): void => {
    if (!cur) {
      cur = [tx(cx, cy), ty(cx, cy)];
    }
  };
  const lineTo = (x: number, y: number): void => {
    begin();
    cur!.push(tx(x, y), ty(x, y));
    cx = x;
    cy = y;
  };
  const cubicTo = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): void => {
    begin();
    flattenCubic(
      tx(cx, cy),
      ty(cx, cy),
      tx(x1, y1),
      ty(x1, y1),
      tx(x2, y2),
      ty(x2, y2),
      tx(x3, y3),
      ty(x3, y3),
      tol,
      0,
      cur!,
    );
    lcx = x2;
    lcy = y2;
    cx = x3;
    cy = y3;
  };
  const quadTo = (x1: number, y1: number, x2: number, y2: number): void => {
    cubicTo(
      cx + (2 / 3) * (x1 - cx),
      cy + (2 / 3) * (y1 - cy),
      x2 + (2 / 3) * (x1 - x2),
      y2 + (2 / 3) * (y1 - y2),
      x2,
      y2,
    );
    lcx = x1;
    lcy = y1;
  };
  const arcTo = (
    rxIn: number,
    ryIn: number,
    rotDeg: number,
    large: number,
    sweep: number,
    x: number,
    y: number,
  ): void => {
    let rx = Math.abs(rxIn);
    let ry = Math.abs(ryIn);
    if (rx === 0 || ry === 0 || (x === cx && y === cy)) {
      lineTo(x, y);
      return;
    }
    const phi = (rotDeg * Math.PI) / 180;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const dx2 = (cx - x) / 2;
    const dy2 = (cy - y) / 2;
    const x1p = cosP * dx2 + sinP * dy2;
    const y1p = -sinP * dx2 + cosP * dy2;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) {
      const s = Math.sqrt(lam);
      rx *= s;
      ry *= s;
    }
    const num1 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = den === 0 ? 0 : Math.sqrt(Math.max(0, num1 / den));
    if (large === sweep) co = -co;
    const cxp = (co * rx * y1p) / ry;
    const cyp = (-co * ry * x1p) / rx;
    const ccx = cosP * cxp - sinP * cyp + (cx + x) / 2;
    const ccy = sinP * cxp + cosP * cyp + (cy + y) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number): number => {
      const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      return a;
    };
    const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dTheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
    else if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

    const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2) - 1e-9));
    const delta = dTheta / segs;
    const k = (4 / 3) * Math.tan(delta / 4);
    let t = theta1;
    for (let s = 0; s < segs; s++) {
      const c1 = Math.cos(t);
      const s1 = Math.sin(t);
      const c2 = Math.cos(t + delta);
      const s2 = Math.sin(t + delta);
      const p1x = c1 - k * s1;
      const p1y = s1 + k * c1;
      const p2x = c2 + k * s2;
      const p2y = s2 - k * c2;
      const map = (ex: number, ey: number): [number, number] => [
        cosP * rx * ex - sinP * ry * ey + ccx,
        sinP * rx * ex + cosP * ry * ey + ccy,
      ];
      const [a1x, a1y] = map(p1x, p1y);
      const [a2x, a2y] = map(p2x, p2y);
      const last = s === segs - 1;
      const [a3x, a3y] = last ? [x, y] : map(c2, s2);
      cubicTo(a1x, a1y, a2x, a2y, a3x, a3y);
      t += delta;
    }
  };

  let cmd = '';
  while (true) {
    skip();
    if (i >= n) break;
    const ch = d[i]!;
    if (/[MmZzLlHhVvCcSsQqTtAa]/.test(ch)) {
      cmd = ch;
      i++;
    } else if (!cmd || cmd === 'Z' || cmd === 'z') {
      return fail(`unexpected character '${ch}' at offset ${i}`);
    }

    const rel = cmd === cmd.toLowerCase();
    const up = cmd.toUpperCase();
    switch (up) {
      case 'M': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        finish();
        cx = sx = x;
        cy = sy = y;
        cur = [tx(x, y), ty(x, y)];
        // Implicit following pairs are LineTo.
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        lineTo(x, y);
        break;
      }
      case 'H': {
        const x = num();
        lineTo(rel ? cx + x : x, cy);
        break;
      }
      case 'V': {
        const y = num();
        lineTo(cx, rel ? cy + y : y);
        break;
      }
      case 'C': {
        let x1 = num();
        let y1 = num();
        let x2 = num();
        let y2 = num();
        let x = num();
        let y = num();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        cubicTo(x1, y1, x2, y2, x, y);
        break;
      }
      case 'S': {
        let x2 = num();
        let y2 = num();
        let x = num();
        let y = num();
        if (rel) {
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        const reflect = prevCmd === 'C' || prevCmd === 'S';
        const x1 = reflect ? 2 * cx - lcx : cx;
        const y1 = reflect ? 2 * cy - lcy : cy;
        cubicTo(x1, y1, x2, y2, x, y);
        break;
      }
      case 'Q': {
        let x1 = num();
        let y1 = num();
        let x = num();
        let y = num();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        quadTo(x1, y1, x, y);
        break;
      }
      case 'T': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        const reflect = prevCmd === 'Q' || prevCmd === 'T';
        const x1 = reflect ? 2 * cx - lcx : cx;
        const y1 = reflect ? 2 * cy - lcy : cy;
        quadTo(x1, y1, x, y);
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = flag();
        const sweep = flag();
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        arcTo(rx, ry, rot, large, sweep, x, y);
        break;
      }
      case 'Z': {
        finish();
        cx = sx;
        cy = sy;
        break;
      }
      default:
        return fail(`unsupported command '${cmd}'`);
    }
    prevCmd = up;
    // Guard against infinite loops on stray separators.
    if (up !== 'Z' && !hasNum() && i < n && !/[MmZzLlHhVvCcSsQqTtAa]/.test(d[i]!)) {
      return fail(`unexpected character '${d[i]}' at offset ${i}`);
    }
  }
  finish();
  return polys;
}

/**
 * Flattens path data with a tolerance relative to the artwork size (about 0.02 px once the shape is
 * fitted to the 1024 grid), so small viewBoxes such as 24x24 icons are not faceted.
 */
export function flattenPathAdaptive(d: string, matrix: Mat = IDENTITY): number[][] {
  const coarse = flattenPath(d, matrix, 1e9);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of coarse) {
    for (let k = 0; k < p.length; k += 2) {
      minX = Math.min(minX, p[k]!);
      maxX = Math.max(maxX, p[k]!);
      minY = Math.min(minY, p[k + 1]!);
      maxY = Math.max(maxY, p[k + 1]!);
    }
  }
  const dim = Math.max(maxX - minX, maxY - minY);
  const tol = Number.isFinite(dim) && dim > 0 ? Math.max(dim * 2.5e-5, 1e-7) : 0.04;
  return flattenPath(d, matrix, tol);
}

// ---------------------------------------------------------------------------
// SVG document -> shape items
// ---------------------------------------------------------------------------

const SKIP_CONTAINERS = new Set([
  'defs',
  'clippath',
  'mask',
  'symbol',
  'style',
  'title',
  'desc',
  'metadata',
  'pattern',
  'marker',
  'lineargradient',
  'radialgradient',
  'filter',
  'script',
  'text',
  'foreignobject',
]);

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    attrs[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? '';
  }
  const style = attrs['style'];
  if (style) {
    for (const part of style.split(';')) {
      const idx = part.indexOf(':');
      if (idx > 0) {
        attrs[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
      }
    }
  }
  return attrs;
}

function len(v: string | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  if (v.trim().endsWith('%')) return fallback;
  const f = parseFloat(v);
  return Number.isFinite(f) ? f : fallback;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} ` +
    `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
  );
}

function rectPath(a: Record<string, string>): string | null {
  const x = len(a['x']);
  const y = len(a['y']);
  const w = len(a['width']);
  const h = len(a['height']);
  if (w <= 0 || h <= 0) return null;
  let rx = len(a['rx'], NaN);
  let ry = len(a['ry'], NaN);
  if (Number.isNaN(rx) && Number.isNaN(ry)) {
    rx = 0;
    ry = 0;
  } else if (Number.isNaN(rx)) {
    rx = ry;
  } else if (Number.isNaN(ry)) {
    ry = rx;
  }
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);
  if (rx === 0 || ry === 0) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  return (
    `M ${x + rx} ${y} H ${x + w - rx} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} ` +
    `V ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} H ${x + rx} ` +
    `A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} V ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
  );
}

function pointsPath(points: string | undefined): string | null {
  if (!points) return null;
  const nums = points
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);
  if (nums.length < 6 || nums.some((v) => !Number.isFinite(v))) return null;
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let k = 2; k + 1 < nums.length; k += 2) d += ` L ${nums[k]} ${nums[k + 1]}`;
  return d + ' Z';
}

interface StackEntry {
  readonly name: string;
  readonly matrix: Mat;
  readonly fill: string | undefined;
  readonly fillRule: FillRule;
  readonly hidden: boolean;
}

/**
 * Minimal, dependency-free SVG reader. Supports path, rect, circle, ellipse, polygon, polyline,
 * nested groups with transforms, fill="none", fill-rule and display:none. Gradients, masks,
 * clip paths, <use> and text are ignored (a wallpaper silhouette only needs geometry).
 */
export function parseSvgDocument(svg: string): SvgShapeItem[] {
  const src = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '');

  const items: SvgShapeItem[] = [];
  const stack: StackEntry[] = [
    { name: '#root', matrix: IDENTITY, fill: undefined, fillRule: 'nonzero', hidden: false },
  ];
  let skipDepth = 0;
  const tagRe = /<(\/?)([a-zA-Z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src)) !== null) {
    const closing = m[1] === '/';
    const name = m[2]!.toLowerCase();
    const selfClosing = m[4] === '/';

    if (closing) {
      if (SKIP_CONTAINERS.has(name)) {
        skipDepth = Math.max(0, skipDepth - 1);
      } else if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    if (SKIP_CONTAINERS.has(name)) {
      if (!selfClosing) skipDepth++;
      continue;
    }
    if (skipDepth > 0) continue;

    const parent = stack[stack.length - 1]!;
    const a = parseAttrs(m[3]!);
    const matrix = mulMat(parent.matrix, parseTransform(a['transform']));
    const hidden =
      parent.hidden || a['display'] === 'none' || a['visibility'] === 'hidden' || a['opacity'] === '0';
    const fill = a['fill'] ?? parent.fill;
    const rule: FillRule =
      (a['fill-rule'] ?? parent.fillRule) === 'evenodd' ? 'evenodd' : 'nonzero';

    let d: string | null = null;
    switch (name) {
      case 'path':
        d = a['d'] ?? null;
        break;
      case 'rect':
        d = rectPath(a);
        break;
      case 'circle': {
        const r = len(a['r']);
        d = r > 0 ? ellipsePath(len(a['cx']), len(a['cy']), r, r) : null;
        break;
      }
      case 'ellipse': {
        const rx = len(a['rx']);
        const ry = len(a['ry']);
        d = rx > 0 && ry > 0 ? ellipsePath(len(a['cx']), len(a['cy']), rx, ry) : null;
        break;
      }
      case 'polygon':
      case 'polyline':
        d = pointsPath(a['points']);
        break;
      default:
        break;
    }

    if (d && !hidden && fill !== 'none' && fill !== 'transparent') {
      items.push({ d, matrix, fillRule: rule });
    }

    if (!selfClosing) {
      stack.push({ name, matrix, fill, fillRule: rule, hidden });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Polygons -> mask + exact signed distance field
// ---------------------------------------------------------------------------

/** Half-width (in grid pixels) of the band around the outline where distance is computed exactly. */
const BAND = 14;

export interface FitResult {
  readonly groups: VectorGroup[];
  readonly scale: number;
}

/**
 * Uniformly scales and centers all polygons so the artwork fills the sampling grid in a
 * consistent way regardless of the source viewBox, padding or units.
 */
export function fitGroupsToGrid(groups: VectorGroup[], grid: number): FitResult {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of groups) {
    for (const p of g.polys) {
      for (let k = 0; k < p.length; k += 2) {
        const x = p[k]!;
        const y = p[k + 1]!;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          throw new AssetLoadError('SVG contains non-finite coordinates');
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  if (!(bw > 0) || !(bh > 0)) {
    throw new AssetLoadError('SVG shape has no visible area');
  }
  const halfDiag = 0.5 * Math.hypot(bw, bh);
  const scale = Math.min((0.72 * grid) / Math.max(bw, bh), (0.44 * grid) / halfDiag);
  const ox = grid / 2 - ((minX + maxX) / 2) * scale;
  const oy = grid / 2 - ((minY + maxY) / 2) * scale;

  const out: VectorGroup[] = groups.map((g) => ({
    fillRule: g.fillRule,
    polys: g.polys.map((p) => {
      const q = new Array<number>(p.length);
      for (let k = 0; k < p.length; k += 2) {
        q[k] = p[k]! * scale + ox;
        q[k + 1] = p[k + 1]! * scale + oy;
      }
      return q;
    }),
  }));
  return { groups: out, scale };
}

/** Exact scanline fill sampled at pixel centers. Groups are unioned. */
export function fillMaskFromGroups(groups: VectorGroup[], size: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (const g of groups) {
    const rows: number[][] = new Array<number[]>(size);
    for (let y = 0; y < size; y++) rows[y] = [];

    for (const p of g.polys) {
      const count = p.length / 2;
      for (let k = 0; k < count; k++) {
        const x0 = p[k * 2]!;
        const y0 = p[k * 2 + 1]!;
        const nk = (k + 1) % count;
        const x1 = p[nk * 2]!;
        const y1 = p[nk * 2 + 1]!;
        if (y0 === y1) continue;
        const dir = y1 > y0 ? 1 : -1;
        const lo = Math.min(y0, y1);
        const hi = Math.max(y0, y1);
        const rowStart = Math.max(0, Math.ceil(lo - 0.5));
        const rowEnd = Math.min(size - 1, Math.ceil(hi - 0.5) - 1);
        const slope = (x1 - x0) / (y1 - y0);
        for (let y = rowStart; y <= rowEnd; y++) {
          const c = y + 0.5;
          rows[y]!.push(x0 + (c - y0) * slope, dir);
        }
      }
    }

    for (let y = 0; y < size; y++) {
      const r = rows[y]!;
      if (r.length === 0) continue;
      const pairs = r.length / 2;
      const order = new Array<number>(pairs);
      for (let k = 0; k < pairs; k++) order[k] = k;
      order.sort((a, b) => r[a * 2]! - r[b * 2]!);

      let winding = 0;
      const base = y * size;
      for (let k = 0; k < pairs - 1; k++) {
        const idx = order[k]!;
        winding += r[idx * 2 + 1]!;
        const inside = g.fillRule === 'evenodd' ? (k + 1) % 2 === 1 : winding !== 0;
        if (!inside) continue;
        const xa = r[idx * 2]!;
        const xb = r[order[k + 1]! * 2]!;
        const from = Math.max(0, Math.ceil(xa - 0.5));
        const to = Math.min(size - 1, Math.ceil(xb - 0.5) - 1);
        for (let x = from; x <= to; x++) mask[base + x] = 1;
      }
    }
  }
  return mask;
}

/**
 * Marks the empty pixels that belong to the outside world. Flooding only travels through pixels at
 * least CRACK_CLEARANCE away from the artwork, so hairline cracks between overlapping subpaths
 * cannot leak the outside into interior pockets; the result is then grown back by the same amount
 * so the real outline keeps its exact outside pixels.
 */
const CRACK_CLEARANCE = 2.5;
function floodExterior(mask: Uint8Array, size: number): Uint8Array {
  const { outDist } = binaryDistances(mask, size, size);
  const open = new Uint8Array(size * size);
  for (let i = 0; i < open.length; i++) {
    open[i] = mask[i] === 0 && outDist[i]! >= CRACK_CLEARANCE ? 1 : 0;
  }

  const core = new Uint8Array(size * size);
  const stack = new Int32Array(size * size);
  let top = 0;
  const push = (i: number): void => {
    if (open[i] === 1 && core[i] === 0) {
      core[i] = 1;
      stack[top++] = i;
    }
  };
  for (let k = 0; k < size; k++) {
    push(k);
    push((size - 1) * size + k);
    push(k * size);
    push(k * size + size - 1);
  }
  while (top > 0) {
    const i = stack[--top]!;
    const x = i % size;
    if (x > 0) push(i - 1);
    if (x < size - 1) push(i + 1);
    if (i >= size) push(i - size);
    if (i < size * (size - 1)) push(i + size);
  }

  // Grow the connected outside back to the artwork edge (distance to the nearest `core` pixel).
  const grown = binaryDistances(core, size, size).outDist;
  const ext = new Uint8Array(size * size);
  for (let i = 0; i < ext.length; i++) {
    ext[i] = mask[i] === 0 && (core[i] === 1 || grown[i]! <= CRACK_CLEARANCE + 1) ? 1 : 0;
  }
  return ext;
}

/** Computes the min squared distance from pixel centers to every outline segment in a band. */
function exactBandDistances(
  groups: VectorGroup[],
  size: number,
  exterior: Uint8Array | null,
): Float32Array {
  const minSq = new Float32Array(size * size).fill(Infinity);
  const isExterior = (x: number, y: number): boolean => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return true;
    return exterior![iy * size + ix] === 0; // `exterior` here is the final solid mask
  };
  for (const g of groups) {
    for (const p of g.polys) {
      const count = p.length / 2;
      for (let k = 0; k < count; k++) {
        const ax = p[k * 2]!;
        const ay = p[k * 2 + 1]!;
        const nk = (k + 1) % count;
        const bx = p[nk * 2]!;
        const by = p[nk * 2 + 1]!;
        const ex = bx - ax;
        const ey = by - ay;
        const l2 = ex * ex + ey * ey;

        if (l2 === 0) continue; // degenerate (zero-length) closing segment

        if (exterior) {
          // Keep only segments that touch the outside world (drops interior detail outlines).
          const l = Math.sqrt(l2);
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const nx = (-ey / l) * 3;
          const ny = (ex / l) * 3;
          if (!isExterior(mx + nx, my + ny) && !isExterior(mx - nx, my - ny)) continue;
        }

        const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - BAND));
        const x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx) + BAND));
        const y0 = Math.max(0, Math.floor(Math.min(ay, by) - BAND));
        const y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by) + BAND));

        for (let y = y0; y <= y1; y++) {
          const py = y + 0.5 - ay;
          const row = y * size;
          for (let x = x0; x <= x1; x++) {
            const px = x + 0.5 - ax;
            let t = l2 > 0 ? (px * ex + py * ey) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const dx = px - ex * t;
            const dy = py - ey * t;
            const dsq = dx * dx + dy * dy;
            if (dsq < minSq[row + x]!) minSq[row + x] = dsq;
          }
        }
      }
    }
  }
  return minSq;
}

/**
 * Builds a signed distance field (pixels of the sampling grid, negative inside) from vector
 * polygon groups. Exact within BAND pixels of the outline, Euclidean-transform based beyond.
 */
export function buildVectorSdf(
  groups: VectorGroup[],
  size: number,
  maxDistance: number,
  fillHoles: boolean = false,
  closeGaps: number = 0,
): SdfData {
  const fitted = fitGroupsToGrid(groups, size).groups;
  const mask = fillMaskFromGroups(fitted, size);

  if (closeGaps > 0) {
    // Morphological closing: dilate by R, then erode by R. Seals gaps narrower than 2R.
    const toArt = distanceToFeature(mask, size, size, 1);
    const dilated = new Uint8Array(mask.length);
    for (let i = 0; i < dilated.length; i++) {
      dilated[i] = mask[i] === 1 || toArt[i]! <= closeGaps ? 1 : 0;
    }
    const toEmpty = distanceToFeature(dilated, size, size, 0);
    for (let i = 0; i < mask.length; i++) {
      if (dilated[i] === 1 && toEmpty[i]! > closeGaps) mask[i] = 1;
    }
  }

  let exterior: Uint8Array | null = null;
  if (fillHoles) {
    exterior = floodExterior(mask, size);
    for (let i = 0; i < mask.length; i++) mask[i] = exterior[i] === 1 ? 0 : 1;
  }

  let inside = 0;
  for (let i = 0; i < mask.length; i++) inside += mask[i]!;
  if (inside === 0) {
    throw new AssetLoadError('SVG shape rasterized to an empty silhouette');
  }

  const minSq = exactBandDistances(fitted, size, exterior || closeGaps > 0 ? mask : null);
  const { outDist, inDist } = binaryDistances(mask, size, size);

  const total = size * size;
  const cpuDistances = new Float32Array(total);
  const floatData = new Float32Array(total);
  const r8Data = new Uint8Array(total);
  const blendStart = BAND - 6;

  for (let i = 0; i < total; i++) {
    const isIn = mask[i] === 1;
    const far = Math.max(0, (isIn ? inDist[i]! : outDist[i]!) - 0.5);
    const sq = minSq[i]!;
    let mag: number;
    if (sq === Infinity) {
      mag = far;
    } else {
      const e = Math.sqrt(sq);
      if (e <= blendStart) {
        mag = e;
      } else {
        const w = Math.min(1, (e - blendStart) / (BAND - blendStart));
        const s = w * w * (3 - 2 * w);
        mag = e * (1 - s) + Math.max(far, e) * s;
      }
    }
    const dist = isIn ? -mag : mag;
    cpuDistances[i] = dist;
    floatData[i] = dist / size;
    const norm = Math.max(0, Math.min(1, (dist / maxDistance) * 0.5 + 0.5));
    r8Data[i] = Math.round(norm * 255);
  }

  return { width: size, height: size, maxDistance, cpuDistances, floatData, r8Data };
}
