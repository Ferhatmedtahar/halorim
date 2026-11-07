import { z, type BaseModeId, type ClickActionId } from '@glowframe/schema';

export type { BaseModeId, ClickActionId };

export interface EffectContext {
  timeSec: number;
  timeMs: number;
  shapeCenter: [number, number];
  shapeScale: number;
}

export interface ModeUniforms {
  pulseFactor: number;
  rotationSpeed: number;
  hueShift: number;
  flickerFactor: number;
  sweep: [number, number, number, number]; // [angle, width, intensity, active]
  orbitPos: [number, number] | null;
}

export interface BaseModeDefinition<TParams = Record<string, unknown>> {
  readonly id: BaseModeId;
  readonly paramSchema: z.ZodType<TParams>;
  readonly uniforms: readonly string[];
  evaluate(params: TParams, ctx: EffectContext, out: ModeUniforms): void;
}

export interface ClickActionDefinition<TParams = Record<string, unknown>> {
  readonly id: ClickActionId;
  readonly paramSchema: z.ZodType<TParams>;
  readonly uniforms: readonly string[];
}

export interface ActiveRipple {
  originU: number;
  originV: number;
  startTime: number;
  duration: number;
  speed: number;
  intensity: number;
}

export interface ActiveBurst {
  startTime: number;
  duration: number;
  intensity: number;
  decay: number;
}
