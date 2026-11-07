import type { ColorOKLab } from './oklch.js';
import { oklchToOklab } from './oklch.js';

export interface SpringConfig {
  /** Natural angular frequency in radians/second (default: 12.0) */
  angularFrequency: number;
  /** Damping ratio (1.0 = critically damped, no overshoot) */
  dampingRatio: number;
}

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  angularFrequency: 14.0,
  dampingRatio: 1.0,
};

/**
 * 4-component Spring state for an OKLab color stop (L, a, b, alpha).
 */
export interface ColorStopSpring {
  // Current values
  L: number;
  a: number;
  b: number;
  alpha: number;
  // Velocities
  vL: number;
  va: number;
  vb: number;
  valpha: number;
  // Target values
  targetL: number;
  targeta: number;
  targetb: number;
  targetAlpha: number;
}

/**
 * Creates an array of pre-allocated spring states (up to maxStops, default 8).
 * Ensures zero per-frame allocations during animations.
 */
export function createPaletteSprings(maxStops: number = 8): ColorStopSpring[] {
  const springs: ColorStopSpring[] = [];
  for (let i = 0; i < maxStops; i++) {
    springs.push({
      L: 0,
      a: 0,
      b: 0,
      alpha: 1,
      vL: 0,
      va: 0,
      vb: 0,
      valpha: 0,
      targetL: 0,
      targeta: 0,
      targetb: 0,
      targetAlpha: 1,
    });
  }
  return springs;
}

/**
 * Sets current and target values immediately (snaps without animation).
 */
export function setSpringTargetsImmediate(
  springs: ColorStopSpring[],
  targets: readonly ColorOKLab[],
): void {
  for (let i = 0; i < springs.length; i++) {
    const s = springs[i]!;
    const t = targets[i % targets.length]!;
    s.L = t.L;
    s.a = t.a;
    s.b = t.b;
    s.alpha = t.alpha;
    s.targetL = t.L;
    s.targeta = t.a;
    s.targetb = t.b;
    s.targetAlpha = t.alpha;
    s.vL = 0;
    s.va = 0;
    s.vb = 0;
    s.valpha = 0;
  }
}

/**
 * Updates targets while preserving current velocities (blends seamlessly on rapid clicks).
 */
export function setSpringTargets(springs: ColorStopSpring[], targets: readonly ColorOKLab[]): void {
  for (let i = 0; i < springs.length; i++) {
    const s = springs[i]!;
    const t = targets[i % targets.length]!;
    s.targetL = t.L;
    s.targeta = t.a;
    s.targetb = t.b;
    s.targetAlpha = t.alpha;
  }
}

/**
 * Step spring physics forward by dt seconds using analytical critically-damped spring integration.
 */
export function stepPaletteSprings(
  springs: ColorStopSpring[],
  stopCount: number,
  dt: number,
  config: SpringConfig = DEFAULT_SPRING_CONFIG,
): boolean {
  if (dt <= 0) return false;
  // Cap dt to avoid numerical instability on frame spikes
  const safeDt = Math.min(dt, 0.1);

  const omega = config.angularFrequency;
  const zeta = config.dampingRatio;
  let isMoving = false;

  for (let i = 0; i < stopCount; i++) {
    const s = springs[i]!;

    // Step each component (L, a, b, alpha)
    s.L = stepComponent(s.L, s.targetL, s.vL, safeDt, omega, zeta, (v) => {
      s.vL = v;
    });
    s.a = stepComponent(s.a, s.targeta, s.va, safeDt, omega, zeta, (v) => {
      s.va = v;
    });
    s.b = stepComponent(s.b, s.targetb, s.vb, safeDt, omega, zeta, (v) => {
      s.vb = v;
    });
    s.alpha = stepComponent(s.alpha, s.targetAlpha, s.valpha, safeDt, omega, zeta, (v) => {
      s.valpha = v;
    });

    if (
      Math.abs(s.L - s.targetL) > 0.0005 ||
      Math.abs(s.a - s.targeta) > 0.0005 ||
      Math.abs(s.b - s.targetb) > 0.0005 ||
      Math.abs(s.vL) > 0.001 ||
      Math.abs(s.va) > 0.001 ||
      Math.abs(s.vb) > 0.001
    ) {
      isMoving = true;
    }
  }

  return isMoving;
}

function stepComponent(
  current: number,
  target: number,
  velocity: number,
  dt: number,
  omega: number,
  zeta: number,
  setVelocity: (v: number) => void,
): number {
  const diff = current - target;
  // Semi-implicit Euler spring integration
  const fSpring = -omega * omega * diff;
  const fDamping = -2.0 * zeta * omega * velocity;
  const accel = fSpring + fDamping;

  const nextVel = velocity + accel * dt;
  const nextPos = current + nextVel * dt;

  setVelocity(nextVel);
  return nextPos;
}

/**
 * Generates a harmonious random palette in OKLCH with consistent brightness and rich chroma.
 * Uses a pseudo-random seed to guarantee determinism if seed is given.
 */
export function generateRandomPalette(seed?: number): ColorOKLab[] {
  const rng = seed !== undefined ? pseudoRandom(seed) : Math.random;

  const baseHue = rng() * 360;
  // Distinct harmonious scheme: analogous or triadic
  const offsets = [0, 45, 90, 150];
  const stops: ColorOKLab[] = [];

  for (let i = 0; i < offsets.length; i++) {
    const hue = (baseHue + offsets[i]!) % 360;
    const L = 0.7 + (rng() - 0.5) * 0.15; // 0.625 to 0.775
    const C = 0.18 + (rng() - 0.5) * 0.06; // 0.15 to 0.21
    const [labL, a, b] = oklchToOklab(L, C, hue);
    stops.push({ L: labL, a, b, alpha: 1.0 });
  }

  return stops;
}

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
