export interface SdfData {
  readonly width: number;
  readonly height: number;
  readonly maxDistance: number;
  readonly cpuDistances: Float32Array; // Signed distance in pixels (< 0 inside, > 0 outside)
  /** Signed distance in units of the sampling grid (pixels / width). Uploaded as an R16F texture. */
  readonly floatData: Float32Array;
  readonly r8Data: Uint8Array; // Legacy normalized R8 bytes [0..255]
}

const INF = 1e9;

/**
 * 1D Felzenszwalb distance transform of function f of length n.
 * Reuses passed buffers v, z, d to avoid allocations.
 */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = +INF;

  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = +INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) {
      k++;
    }
    const vk = v[k]!;
    const diff = q - vk;
    d[q] = diff * diff + f[vk]!;
  }
}

/**
 * Computes exact 2D squared Euclidean distance transform of an input binary mask.
 * featureVal = 1 means pixels with mask[i] === 1 are feature seeds (distance = 0).
 */
function edt2d(
  mask: Uint8Array,
  width: number,
  height: number,
  featureVal: number,
  outputSquared: Float64Array,
): void {
  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  // Temporary buffer for column results
  const temp = new Float64Array(width * height);

  // Pass 1: Columns
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = mask[y * width + x] === featureVal ? 0 : INF;
    }
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) {
      temp[y * width + x] = d[y]!;
    }
  }

  // Pass 2: Rows
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      f[x] = temp[y * width + x]!;
    }
    edt1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) {
      outputSquared[y * width + x] = d[x]!;
    }
  }
}

/** Euclidean distance (pixels) from every pixel to the nearest pixel whose mask value is `featureVal`. */
export function distanceToFeature(
  mask: Uint8Array,
  width: number,
  height: number,
  featureVal: 0 | 1,
): Float32Array {
  const sq = new Float64Array(width * height);
  const out = new Float32Array(width * height);
  edt2d(mask, width, height, featureVal, sq);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(sq[i]!);
  return out;
}

/**
 * Euclidean distance (pixels) from every pixel to the nearest pixel of the opposite class.
 * outDist: distance from outside pixels to the nearest inside pixel (0 for inside pixels).
 * inDist: distance from inside pixels to the nearest outside pixel (0 for outside pixels).
 */
export function binaryDistances(
  mask: Uint8Array,
  width: number,
  height: number,
): { outDist: Float32Array; inDist: Float32Array } {
  const total = width * height;
  const sq = new Float64Array(total);
  const outDist = new Float32Array(total);
  const inDist = new Float32Array(total);
  edt2d(mask, width, height, 1, sq);
  for (let i = 0; i < total; i++) outDist[i] = Math.sqrt(sq[i]!);
  edt2d(mask, width, height, 0, sq);
  for (let i = 0; i < total; i++) inDist[i] = Math.sqrt(sq[i]!);
  return { outDist, inDist };
}

/**
 * Computes a signed distance field (SDF) from a binary silhouette mask.
 * Pixel values: 1 = inside shape, 0 = outside shape.
 * Returns exact CPU signed distances and normalized R8 texture bytes.
 */
export function computeSdf(
  mask: Uint8Array,
  width: number,
  height: number,
  maxDistance: number = 64,
): SdfData {
  const total = width * height;
  const dOutSq = new Float64Array(total);
  const dInSq = new Float64Array(total);

  // Distance from exterior pixels to nearest interior pixel (mask === 1)
  edt2d(mask, width, height, 1, dOutSq);
  // Distance from interior pixels to nearest exterior pixel (mask === 0)
  edt2d(mask, width, height, 0, dInSq);

  const cpuDistances = new Float32Array(total);
  const floatData = new Float32Array(total);
  const r8Data = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const isInside = mask[i] === 1;
    let dist: number;
    if (isInside) {
      // Inside: negative distance to outer boundary
      dist = -Math.sqrt(dInSq[i]!);
    } else {
      // Outside: positive distance to inner boundary
      dist = +Math.sqrt(dOutSq[i]!);
    }

    cpuDistances[i] = dist;
    floatData[i] = dist / width;

    // Normalize: -maxDistance -> 0.0, 0 -> 0.5 (128), +maxDistance -> 1.0 (255)
    const norm = Math.max(0, Math.min(1, (dist / maxDistance) * 0.5 + 0.5));
    r8Data[i] = Math.round(norm * 255);
  }

  return {
    width,
    height,
    maxDistance,
    cpuDistances,
    floatData,
    r8Data,
  };
}
