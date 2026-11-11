import { computeSdf, type SdfData } from './edt.js';

const WORKER_SCRIPT = `
self.onmessage = function(e) {
  var mask = new Uint8Array(e.data.maskBuffer);
  var width = e.data.width;
  var height = e.data.height;
  var maxDistance = e.data.maxDistance;

  var INF = 1e9;
  function edt1d(f, n, d, v, z) {
    var k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = +INF;
    for (var q = 1; q < n; q++) {
      var s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = +INF;
    }
    k = 0;
    for (var q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      var vk = v[k];
      var diff = q - vk;
      d[q] = diff * diff + f[vk];
    }
  }

  function edt2d(maskArr, w, h, featureVal, out) {
    var maxDim = Math.max(w, h);
    var f = new Float64Array(maxDim);
    var d = new Float64Array(maxDim);
    var v = new Int32Array(maxDim);
    var z = new Float64Array(maxDim + 1);
    var temp = new Float64Array(w * h);

    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
        f[y] = maskArr[y * w + x] === featureVal ? 0 : INF;
      }
      edt1d(f, h, d, v, z);
      for (var y = 0; y < h; y++) {
        temp[y * w + x] = d[y];
      }
    }

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        f[x] = temp[y * w + x];
      }
      edt1d(f, w, d, v, z);
      for (var x = 0; x < w; x++) {
        out[y * w + x] = d[x];
      }
    }
  }

  var total = width * height;
  var dOutSq = new Float64Array(total);
  var dInSq = new Float64Array(total);
  edt2d(mask, width, height, 1, dOutSq);
  edt2d(mask, width, height, 0, dInSq);

  var cpuDistances = new Float32Array(total);
  var r8Data = new Uint8Array(total);

  for (var i = 0; i < total; i++) {
    var isInside = mask[i] === 1;
    var dist = isInside ? -Math.sqrt(dInSq[i]) : +Math.sqrt(dOutSq[i]);
    cpuDistances[i] = dist;
    var norm = Math.max(0, Math.min(1, (dist / maxDistance) * 0.5 + 0.5));
    r8Data[i] = Math.round(norm * 255);
  }

  self.postMessage(
    {
      width: width,
      height: height,
      maxDistance: maxDistance,
      cpuDistances: cpuDistances,
      r8Data: r8Data
    },
    [cpuDistances.buffer, r8Data.buffer]
  );
};
`;

let cachedWorkerUrl: string | null = null;

function getWorkerUrl(): string | null {
  if (cachedWorkerUrl) return cachedWorkerUrl;
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      cachedWorkerUrl = URL.createObjectURL(blob);
      return cachedWorkerUrl;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Computes exact Signed Distance Field asynchronously in a Web Worker.
 * Automatically falls back to synchronous computation when Workers are unavailable.
 */
export async function computeSdfAsync(
  mask: Uint8Array,
  width: number,
  height: number,
  maxDistance: number = 96,
): Promise<SdfData> {
  const workerUrl = getWorkerUrl();

  if (typeof Worker !== 'undefined' && workerUrl) {
    return new Promise<SdfData>((resolve, reject) => {
      try {
        const worker = new Worker(workerUrl);
        // Transfer copy of mask buffer to avoid mutating or detaching original
        const maskCopy = new Uint8Array(mask);

        worker.onmessage = (e: MessageEvent) => {
          worker.terminate();
          const cpuDistances = e.data.cpuDistances as Float32Array;
          const floatData = new Float32Array(cpuDistances.length);
          for (let i = 0; i < cpuDistances.length; i++) {
            floatData[i] = cpuDistances[i]! / e.data.width;
          }
          resolve({
            width: e.data.width,
            height: e.data.height,
            maxDistance: e.data.maxDistance,
            cpuDistances,
            floatData,
            r8Data: e.data.r8Data,
          });
        };

        worker.onerror = (err) => {
          worker.terminate();
          // Fall back to synchronous on worker runtime error
          try {
            resolve(computeSdf(mask, width, height, maxDistance));
          } catch {
            reject(err);
          }
        };

        worker.postMessage(
          {
            maskBuffer: maskCopy.buffer,
            width,
            height,
            maxDistance,
          },
          [maskCopy.buffer],
        );
      } catch {
        resolve(computeSdf(mask, width, height, maxDistance));
      }
    });
  }

  return computeSdf(mask, width, height, maxDistance);
}
