import { describe, it, expect } from 'vitest';
import {
  BASE_MODES,
  CLICK_ACTIONS,
  ALL_BASE_MODE_IDS,
  ALL_CLICK_ACTION_IDS,
  createRenderer,
  type EffectContext,
  type ModeUniforms,
} from '../index.js';
import { exampleScene } from '@glowframe/schema';
import { ManualClock } from '../clock.js';

describe('Base Modes and Effects Registry', () => {
  it('registers all required base modes with id, paramSchema, and uniforms', () => {
    expect(ALL_BASE_MODE_IDS).toEqual([
      'glow',
      'pulse',
      'rotate',
      'spectrum-cycle',
      'flicker',
      'sweep',
      'orbit',
    ]);

    for (const id of ALL_BASE_MODE_IDS) {
      const mode = BASE_MODES[id];
      expect(mode).toBeDefined();
      expect(mode.id).toBe(id);
      expect(mode.paramSchema).toBeDefined();
      expect(Array.isArray(mode.uniforms)).toBe(true);
      expect(typeof mode.evaluate).toBe('function');
    }
  });

  it('registers all click actions with id, paramSchema, and uniforms', () => {
    expect(ALL_CLICK_ACTION_IDS).toEqual([
      'next-palette',
      'random-palette',
      'ripple',
      'burst',
      'next-mode',
      'toggle-content',
      'none',
    ]);

    for (const id of ALL_CLICK_ACTION_IDS) {
      const action = CLICK_ACTIONS[id];
      expect(action).toBeDefined();
      expect(action.id).toBe(id);
      expect(action.paramSchema).toBeDefined();
      expect(Array.isArray(action.uniforms)).toBe(true);
    }
  });

  it('validates param schemas correctly', () => {
    // Pulse schema defaults
    const pulseParsed = BASE_MODES.pulse.paramSchema.parse({});
    expect(pulseParsed).toEqual({ speed: 2.0, depth: 0.35 });

    // Rotate schema defaults
    const rotateParsed = BASE_MODES.rotate.paramSchema.parse({});
    expect(rotateParsed).toEqual({ speed: 0.25 });

    // Sweep schema defaults
    const sweepParsed = BASE_MODES.sweep.paramSchema.parse({});
    expect(sweepParsed).toEqual({ speed: 0.4, width: 0.08, intensity: 1.8 });

    // Ripple schema defaults
    const rippleParsed = CLICK_ACTIONS.ripple.paramSchema.parse({});
    expect(rippleParsed).toEqual({ speed: 1.5, duration: 0.6, intensity: 1.5 });

    // Burst schema defaults
    const burstParsed = CLICK_ACTIONS.burst.paramSchema.parse({});
    expect(burstParsed).toEqual({ intensity: 2.0, decay: 4.0, duration: 0.5 });
  });

  it('evaluates glow mode correctly (static reference baseline)', () => {
    const out: ModeUniforms = {
      pulseFactor: 0,
      rotationSpeed: 1,
      hueShift: 1,
      flickerFactor: 0,
      sweep: [1, 1, 1, 1],
      orbitPos: [0, 0],
    };
    const ctx: EffectContext = {
      timeSec: 10,
      timeMs: 10000,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES.glow.evaluate({}, ctx, out);

    expect(out.pulseFactor).toBe(1.0);
    expect(out.rotationSpeed).toBe(0.0);
    expect(out.hueShift).toBe(0.0);
    expect(out.flickerFactor).toBe(1.0);
    expect(out.sweep[3]).toBe(0.0);
    expect(out.orbitPos).toBeNull();
  });

  it('evaluates pulse mode breathing curve accurately', () => {
    const out: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 0.125, // quarter of 2Hz period (0.5s period) -> peak sine = 1.0
      timeMs: 125,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES.pulse.evaluate({ speed: 2.0, depth: 0.4 }, ctx, out);
    expect(out.pulseFactor).toBeCloseTo(1.4, 4);

    // Three-quarters of period -> trough sine = -1.0
    ctx.timeSec = 0.375;
    BASE_MODES.pulse.evaluate({ speed: 2.0, depth: 0.4 }, ctx, out);
    expect(out.pulseFactor).toBeCloseTo(0.6, 4);
  });

  it('evaluates rotate mode speed', () => {
    const out: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 1,
      timeMs: 1000,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES.rotate.evaluate({ speed: 0.5 }, ctx, out);
    expect(out.rotationSpeed).toBe(0.5);
  });

  it('evaluates spectrum-cycle wrap-around', () => {
    const out: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 2.5,
      timeMs: 2500,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES['spectrum-cycle'].evaluate({ speed: 0.5 }, ctx, out);
    // 2.5 * 0.5 = 1.25 -> wraps to 0.25
    expect(out.hueShift).toBeCloseTo(0.25, 4);
  });

  it('evaluates flicker mode deterministically with fixed seed and time', () => {
    const out1: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const out2: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 1.234,
      timeMs: 1234,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES.flicker.evaluate({ seed: 77, depth: 0.3 }, ctx, out1);
    BASE_MODES.flicker.evaluate({ seed: 77, depth: 0.3 }, ctx, out2);

    expect(out1.flickerFactor).toBe(out2.flickerFactor);
    expect(out1.flickerFactor).toBeGreaterThan(0.1);
  });

  it('evaluates sweep beam angle and width', () => {
    const out: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 2.0,
      timeMs: 2000,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.3,
    };

    BASE_MODES.sweep.evaluate({ speed: 0.4, width: 0.05, intensity: 2.0 }, ctx, out);
    expect(out.sweep[0]).toBeCloseTo(0.8, 4); // (2.0 * 0.4) % 1.0 = 0.8
    expect(out.sweep[1]).toBe(0.05);
    expect(out.sweep[2]).toBe(2.0);
    expect(out.sweep[3]).toBe(1.0);
  });

  it('evaluates orbit position along circular trajectory', () => {
    const out: ModeUniforms = {
      pulseFactor: 1,
      rotationSpeed: 0,
      hueShift: 0,
      flickerFactor: 1,
      sweep: [0, 0, 0, 0],
      orbitPos: null,
    };
    const ctx: EffectContext = {
      timeSec: 0,
      timeMs: 0,
      shapeCenter: [0.5, 0.5],
      shapeScale: 0.2,
    };

    BASE_MODES.orbit.evaluate({ speed: 1.0, radius: 1.5 }, ctx, out);
    expect(out.orbitPos).not.toBeNull();
    // At t=0: x = 0.5 + cos(0) * (0.2 * 1.5) = 0.8, y = 0.5 + sin(0) = 0.5
    expect(out.orbitPos![0]).toBeCloseTo(0.8, 4);
    expect(out.orbitPos![1]).toBeCloseTo(0.5, 4);
  });
});

describe('Renderer Mode and Click Action Switching', () => {
  function createMockCanvas(): HTMLCanvasElement {
    const canvas = {
      width: 400,
      height: 300,
      getContext: (type: string) => {
        if (type !== 'webgl2') return null;
        return {
          viewport: () => {},
          clearColor: () => {},
          clear: () => {},
          useProgram: () => {},
          activeTexture: () => {},
          bindTexture: () => {},
          bindVertexArray: () => {},
          drawArrays: () => {},
          uniform1i: () => {},
          uniform1f: () => {},
          uniform2f: () => {},
          uniform3fv: () => {},
          uniform4fv: () => {},
          getUniformLocation: (_p: unknown, name: string) => ({ name }),
          createTexture: () => ({}),
          texImage2D: () => {},
          texSubImage2D: () => {},
          texParameteri: () => {},
          deleteTexture: () => {},
          createProgram: () => ({}),
          createShader: () => ({}),
          shaderSource: () => {},
          compileShader: () => {},
          getShaderParameter: () => true,
          getShaderInfoLog: () => '',
          attachShader: () => {},
          detachShader: () => {},
          linkProgram: () => {},
          pixelStorei: () => {},
          getProgramParameter: () => true,
          getProgramInfoLog: () => '',
          deleteShader: () => {},
          deleteProgram: () => {},
          createVertexArray: () => ({}),
          deleteVertexArray: () => {},
          createBuffer: () => ({}),
          bindBuffer: () => {},
          bufferData: () => {},
          enableVertexAttribArray: () => {},
          vertexAttribPointer: () => {},
          deleteBuffer: () => {},
          getExtension: () => null,
          COLOR_BUFFER_BIT: 16384,
          ARRAY_BUFFER: 34962,
          STATIC_DRAW: 35044,
          TEXTURE_2D: 3553,
          UNPACK_ALIGNMENT: 3317,
          R8: 33321,
          RED: 6403,
          UNSIGNED_BYTE: 5121,
          LINEAR: 9729,
          CLAMP_TO_EDGE: 33071,
          TEXTURE_MIN_FILTER: 10241,
          TEXTURE_MAG_FILTER: 10240,
          TEXTURE_WRAP_S: 10242,
          TEXTURE_WRAP_T: 10243,
          TEXTURE0: 33984,
        };
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;
    return canvas;
  }

  it('cycles base modes via next-mode triggerAction without leaking resources', () => {
    const canvas = createMockCanvas();
    const clock = new ManualClock(0);
    const renderer = createRenderer({ canvas, scene: exampleScene, clock });

    expect(renderer.getActiveMode()).toBe('glow');

    // Cycle through all modes multiple times
    for (let cycle = 0; cycle < 14; cycle++) {
      renderer.triggerAction('next-mode');
      const expectedMode = ALL_BASE_MODE_IDS[(cycle + 1) % ALL_BASE_MODE_IDS.length];
      expect(renderer.getActiveMode()).toBe(expectedMode);
    }

    renderer.dispose();
  });

  it('switches modes at runtime via setMode', () => {
    const canvas = createMockCanvas();
    const clock = new ManualClock(0);
    const renderer = createRenderer({ canvas, scene: exampleScene, clock });

    renderer.setMode('pulse', { speed: 3.0, depth: 0.5 });
    expect(renderer.getActiveMode()).toBe('pulse');

    renderer.renderFrame(1000);
    const uniforms = renderer.getUniformValues();
    expect(uniforms.u_pulseFactor).toBeDefined();

    renderer.setMode('rotate', { speed: 0.8 });
    expect(renderer.getActiveMode()).toBe('rotate');

    renderer.renderFrame(2000);
    expect(renderer.getUniformValues().u_rotationSpeed).toBe(0.8);

    renderer.dispose();
  });

  it('handles burst action and exponential decay', () => {
    const canvas = createMockCanvas();
    const clock = new ManualClock(1000);
    const renderer = createRenderer({ canvas, scene: exampleScene, clock });

    renderer.renderFrame(1000);
    expect(renderer.getUniformValues().u_burstFactor).toBe(0.0);

    // Trigger burst at t=1000
    renderer.triggerAction('burst', { intensity: 2.5, decay: 4.0, duration: 0.5 });
    renderer.renderFrame(1000);
    expect(renderer.getUniformValues().u_burstFactor).toBeCloseTo(2.5, 2);

    // At t=1100 (100ms later)
    renderer.renderFrame(1100);
    // 2.5 * exp(-4.0 * 0.1) = 2.5 * exp(-0.4) ≈ 1.675
    expect(renderer.getUniformValues().u_burstFactor).toBeCloseTo(1.675, 1);

    // At t=1600 (after 500ms duration)
    renderer.renderFrame(1600);
    expect(renderer.getUniformValues().u_burstFactor).toBe(0.0);

    renderer.dispose();
  });

  it('handles ripple action outward expansion and decay', () => {
    const canvas = createMockCanvas();
    const clock = new ManualClock(500);
    const renderer = createRenderer({ canvas, scene: exampleScene, clock });

    renderer.renderFrame(500);
    expect(renderer.getUniformValues().u_ripple[3]).toBe(0.0);

    // Trigger ripple from shape UV [0.4, 0.6]
    renderer.triggerAction(
      'ripple',
      { speed: 2.0, duration: 0.5, intensity: 1.8 },
      [0.5, 0.5], // screen pos
    );

    // Immediately at t=500 (dt=0)
    renderer.renderFrame(500);
    const ripple0 = renderer.getUniformValues().u_ripple;
    expect(ripple0[2]).toBe(0.0); // radius = 0
    expect(ripple0[3]).toBeCloseTo(1.8, 2); // full intensity

    // At t=700 (200ms elapsed, 40% duration)
    renderer.renderFrame(700);
    const ripple1 = renderer.getUniformValues().u_ripple;
    expect(ripple1[2]).toBeCloseTo(0.4, 2); // 0.2s * 2.0 = 0.4
    expect(ripple1[3]).toBeCloseTo(1.08, 2); // 1.8 * (1 - 0.4) = 1.08

    // At t=1100 (after 500ms duration)
    renderer.renderFrame(1100);
    expect(renderer.getUniformValues().u_ripple[3]).toBe(0.0);

    renderer.dispose();
  });

  it('handles toggle-content action', () => {
    const canvas = createMockCanvas();
    const clock = new ManualClock(0);
    const renderer = createRenderer({ canvas, scene: exampleScene, clock });

    expect(renderer.isContentVisible()).toBe(true);

    renderer.triggerAction('toggle-content');
    expect(renderer.isContentVisible()).toBe(false);

    renderer.triggerAction('toggle-content');
    expect(renderer.isContentVisible()).toBe(true);

    renderer.dispose();
  });
});
