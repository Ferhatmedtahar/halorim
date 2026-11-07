import { z, type BaseModeId, type ClickActionId } from '@glowframe/schema';
import type { BaseModeDefinition, ClickActionDefinition } from './types.js';

export const BASE_MODES: Record<BaseModeId, BaseModeDefinition<Record<string, unknown>>> = {
  glow: {
    id: 'glow',
    paramSchema: z.object({}),
    uniforms: [],
    evaluate(_params, _ctx, out) {
      out.pulseFactor = 1.0;
      out.rotationSpeed = 0.0;
      out.hueShift = 0.0;
      out.flickerFactor = 1.0;
      out.sweep[3] = 0.0;
      out.orbitPos = null;
    },
  },

  pulse: {
    id: 'pulse',
    paramSchema: z.object({
      speed: z.number().default(2.0),
      depth: z.number().min(0).max(1).default(0.35),
    }),
    uniforms: ['u_pulseFactor'],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === 'number' ? params.speed : 2.0;
      const depth = typeof params?.depth === 'number' ? params.depth : 0.35;
      out.pulseFactor = 1.0 + depth * Math.sin(ctx.timeSec * speed * Math.PI * 2);
      out.rotationSpeed = 0.0;
      out.hueShift = 0.0;
      out.flickerFactor = 1.0;
      out.sweep[3] = 0.0;
      out.orbitPos = null;
    },
  },

  rotate: {
    id: 'rotate',
    paramSchema: z.object({
      speed: z.number().default(0.25),
    }),
    uniforms: ['u_rotationSpeed'],
    evaluate(params, _ctx, out) {
      const speed = typeof params?.speed === 'number' ? params.speed : 0.25;
      out.pulseFactor = 1.0;
      out.rotationSpeed = speed;
      out.hueShift = 0.0;
      out.flickerFactor = 1.0;
      out.sweep[3] = 0.0;
      out.orbitPos = null;
    },
  },

  'spectrum-cycle': {
    id: 'spectrum-cycle',
    paramSchema: z.object({
      speed: z.number().default(0.15),
    }),
    uniforms: ['u_hueShift'],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === 'number' ? params.speed : 0.15;
      out.pulseFactor = 1.0;
      out.rotationSpeed = 0.0;
      out.hueShift = (((ctx.timeSec * speed) % 1.0) + 1.0) % 1.0;
      out.flickerFactor = 1.0;
      out.sweep[3] = 0.0;
      out.orbitPos = null;
    },
  },

  flicker: {
    id: 'flicker',
    paramSchema: z.object({
      seed: z.number().default(42),
      depth: z.number().min(0).max(1).default(0.2),
      speed: z.number().default(15.0),
    }),
    uniforms: ['u_flickerFactor'],
    evaluate(params, ctx, out) {
      const seed = typeof params?.seed === 'number' ? params.seed : 42;
      const depth = typeof params?.depth === 'number' ? params.depth : 0.2;
      const speed = typeof params?.speed === 'number' ? params.speed : 15.0;

      const s1 = Math.sin(ctx.timeSec * speed * 1.7 + seed * 1.3);
      const s2 = Math.cos(ctx.timeSec * speed * 3.9 + seed * 2.7);
      const s3 = Math.sin(ctx.timeSec * speed * 8.3 + seed * 4.1);
      const jitter = (s1 * 0.5 + s2 * 0.3 + s3 * 0.2) * depth;

      out.pulseFactor = 1.0;
      out.rotationSpeed = 0.0;
      out.hueShift = 0.0;
      out.flickerFactor = Math.max(0.1, 1.0 + jitter);
      out.sweep[3] = 0.0;
      out.orbitPos = null;
    },
  },

  sweep: {
    id: 'sweep',
    paramSchema: z.object({
      speed: z.number().default(0.4),
      width: z.number().positive().default(0.08),
      intensity: z.number().positive().default(1.8),
    }),
    uniforms: ['u_sweep'],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === 'number' ? params.speed : 0.4;
      const width = typeof params?.width === 'number' ? params.width : 0.08;
      const intensity = typeof params?.intensity === 'number' ? params.intensity : 1.8;

      out.pulseFactor = 1.0;
      out.rotationSpeed = 0.0;
      out.hueShift = 0.0;
      out.flickerFactor = 1.0;
      out.sweep[0] = (((ctx.timeSec * speed) % 1.0) + 1.0) % 1.0;
      out.sweep[1] = width;
      out.sweep[2] = intensity;
      out.sweep[3] = 1.0;
      out.orbitPos = null;
    },
  },

  orbit: {
    id: 'orbit',
    paramSchema: z.object({
      speed: z.number().default(0.8),
      radius: z.number().positive().default(1.3),
    }),
    uniforms: ['u_cursorPos', 'u_hasCursor'],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === 'number' ? params.speed : 0.8;
      const radiusFactor = typeof params?.radius === 'number' ? params.radius : 1.3;
      const orbitAngle = ctx.timeSec * speed;
      const radius = ctx.shapeScale * radiusFactor;

      out.pulseFactor = 1.0;
      out.rotationSpeed = 0.0;
      out.hueShift = 0.0;
      out.flickerFactor = 1.0;
      out.sweep[3] = 0.0;
      out.orbitPos = [
        ctx.shapeCenter[0] + Math.cos(orbitAngle) * radius,
        ctx.shapeCenter[1] + Math.sin(orbitAngle) * radius,
      ];
    },
  },
};

export const CLICK_ACTIONS: Record<
  ClickActionId,
  ClickActionDefinition<Record<string, unknown>>
> = {
  'next-palette': {
    id: 'next-palette',
    paramSchema: z.object({}),
    uniforms: ['u_palette[0]'],
  },

  'random-palette': {
    id: 'random-palette',
    paramSchema: z.object({
      seed: z.number().optional(),
    }),
    uniforms: ['u_palette[0]'],
  },

  ripple: {
    id: 'ripple',
    paramSchema: z.object({
      speed: z.number().default(1.5),
      duration: z.number().default(0.6),
      intensity: z.number().default(1.5),
    }),
    uniforms: ['u_ripple'],
  },

  burst: {
    id: 'burst',
    paramSchema: z.object({
      intensity: z.number().default(2.0),
      decay: z.number().default(4.0),
      duration: z.number().default(0.5),
    }),
    uniforms: ['u_burstFactor'],
  },

  'next-mode': {
    id: 'next-mode',
    paramSchema: z.object({
      modes: z.array(z.string()).optional(),
    }),
    uniforms: [],
  },

  'toggle-content': {
    id: 'toggle-content',
    paramSchema: z.object({}),
    uniforms: [],
  },

  none: {
    id: 'none',
    paramSchema: z.object({}),
    uniforms: [],
  },
};

export const ALL_BASE_MODE_IDS: readonly BaseModeId[] = [
  'glow',
  'pulse',
  'rotate',
  'spectrum-cycle',
  'flicker',
  'sweep',
  'orbit',
];

export const ALL_CLICK_ACTION_IDS: readonly ClickActionId[] = [
  'next-palette',
  'random-palette',
  'ripple',
  'burst',
  'next-mode',
  'toggle-content',
  'none',
];
