import * as fs from 'node:fs';
import * as path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Golden-image comparison for the WebGL e2e tests.
 *
 * Compares a fresh screenshot against the committed reference PNG. References are only
 * (re)written when UPDATE_GOLDEN=1 is set:
 *
 *   UPDATE_GOLDEN=1 pnpm test
 *
 * On a mismatch, `<name>.actual.png` and `<name>.diff.png` are written next to the reference
 * (both gitignored) so the change can be inspected.
 */

export interface GoldenOptions {
  /** pixelmatch threshold (0-1, OKLab distance); smaller is more sensitive. */
  threshold?: number;
  /** Max fraction of differing pixels before the comparison fails. */
  maxDiffRatio?: number;
}

export interface GoldenResult {
  width: number;
  height: number;
  diffPixels: number;
  diffRatio: number;
}

const DEFAULTS: Required<GoldenOptions> = {
  // The tests render with SwiftShader, which is deterministic on a given Chromium build. The
  // tolerance only absorbs small rasterisation drift between Chromium versions.
  // pixelmatch's default (0.1) is too loose here: scaling the glow's red and blue by 0.8 changed
  // under 0.1% of pixels at 0.1, but 2.6-3.6% at 0.03.
  threshold: 0.03,
  maxDiffRatio: 0.001,
};

export function shouldUpdateGolden(): boolean {
  return process.env.UPDATE_GOLDEN === '1';
}

function siblingPath(goldenPath: string, suffix: string): string {
  const ext = path.extname(goldenPath);
  return goldenPath.slice(0, -ext.length) + suffix + ext;
}

/**
 * Throws if `actual` differs from the PNG at `goldenPath` beyond the given tolerance.
 * Returns null when UPDATE_GOLDEN=1 rewrote the reference instead of comparing.
 */
export function expectMatchesGolden(
  actual: Buffer,
  goldenPath: string,
  options: GoldenOptions = {},
): GoldenResult | null {
  const { threshold, maxDiffRatio } = { ...DEFAULTS, ...options };
  const name = path.basename(goldenPath);
  const actualPath = siblingPath(goldenPath, '.actual');
  const diffPath = siblingPath(goldenPath, '.diff');
  const clearArtifacts = () => {
    fs.rmSync(actualPath, { force: true });
    fs.rmSync(diffPath, { force: true });
  };

  if (shouldUpdateGolden()) {
    fs.writeFileSync(goldenPath, actual);
    clearArtifacts();
    return null;
  }

  if (!fs.existsSync(goldenPath)) {
    fs.writeFileSync(actualPath, actual);
    throw new Error(
      `Golden image ${name} is missing. Inspect ${path.basename(actualPath)} and run with ` +
        `UPDATE_GOLDEN=1 to accept it.`,
    );
  }

  const exp = PNG.sync.read(fs.readFileSync(goldenPath));
  const act = PNG.sync.read(actual);

  if (exp.width !== act.width || exp.height !== act.height) {
    fs.writeFileSync(actualPath, actual);
    throw new Error(
      `Golden image ${name} size changed: expected ${exp.width}x${exp.height}, ` +
        `got ${act.width}x${act.height}. See ${path.basename(actualPath)}. ` +
        `If the change is intended, run with UPDATE_GOLDEN=1.`,
    );
  }

  const { width, height } = act;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(exp.data, act.data, diff.data, width, height, { threshold });
  const diffRatio = diffPixels / (width * height);

  if (diffRatio > maxDiffRatio) {
    fs.writeFileSync(actualPath, actual);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    throw new Error(
      `Golden image ${name} does not match: ${diffPixels} of ${width * height} pixels differ ` +
        `(${(diffRatio * 100).toFixed(3)}%, limit ${(maxDiffRatio * 100).toFixed(3)}%, ` +
        `threshold ${threshold}). See ${path.basename(actualPath)} and ` +
        `${path.basename(diffPath)}. If the change is intended, run with UPDATE_GOLDEN=1.`,
    );
  }

  clearArtifacts();
  return { width, height, diffPixels, diffRatio };
}
