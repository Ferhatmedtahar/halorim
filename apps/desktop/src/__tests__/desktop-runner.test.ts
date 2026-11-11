import { describe, it, expect } from 'vitest';
import { createRenderer, ManualClock } from '@glowframe/core';
import { triangleScene, PRESET_SCENES } from '@glowframe/presets';
import { HostInput } from '../host-input.ts';

describe('Desktop Runner Webview Engine & Host Input Integration', () => {
  function createMockCanvas(w = 1920, h = 1080) {
    const glMock = {
      canvas: { width: w, height: h },
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      getShaderInfoLog: () => '',
      createProgram: () => ({}),
      attachShader: () => {},
      detachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      getProgramInfoLog: () => '',
      useProgram: () => {},
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      getUniformLocation: () => ({}),
      uniform1f: () => {},
      uniform2f: () => {},
      uniform3f: () => {},
      uniform4f: () => {},
      uniform1i: () => {},
      uniform1fv: () => {},
      uniform2fv: () => {},
      uniform3fv: () => {},
      uniform4fv: () => {},
      uniformMatrix3fv: () => {},
      uniformMatrix4fv: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      pixelStorei: () => {},
      activeTexture: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      drawArrays: () => {},
      deleteBuffer: () => {},
      deleteProgram: () => {},
      deleteShader: () => {},
      deleteTexture: () => {},
      createVertexArray: () => ({}),
      bindVertexArray: () => {},
      deleteVertexArray: () => {},
      getExtension: () => null,
      getError: () => 0,
      COLOR_BUFFER_BIT: 16384,
      TRIANGLE_STRIP: 5,
      FLOAT: 5126,
      TEXTURE_2D: 3553,
      TEXTURE0: 33984,
      R8: 33321,
      RED: 6403,
      UNSIGNED_BYTE: 5121,
      CLAMP_TO_EDGE: 33071,
      TEXTURE_WRAP_S: 10242,
      TEXTURE_WRAP_T: 10243,
      TEXTURE_MIN_FILTER: 10241,
      TEXTURE_MAG_FILTER: 10240,
      LINEAR: 9729,
      UNPACK_ALIGNMENT: 3317,
    };

    return {
      width: w,
      height: h,
      getContext: (type: string) => (type === 'webgl2' ? glMock : null),
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: w,
        height: h,
        right: w,
        bottom: h,
      }),
    } as unknown as HTMLCanvasElement;
  }

  it('initializes desktop renderer with HostInput and follows global pointer', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(1000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    // Simulate IPC cursor-move from Windows host
    input.emitPointerMove(0.7, 0.3);
    const target = renderer.getTargetCursorPosition();
    expect(target[0]).toBeCloseTo(0.7);
    expect(target[1]).toBeCloseTo(0.3);

    renderer.dispose();
  });

  it('pauses and resumes renderer upon fullscreen app or battery saver signals', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(1000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    renderer.start();
    expect(renderer.isRunning).toBe(true);
    expect(renderer.isPaused).toBe(false);

    // Host reports fullscreen application active
    renderer.setPaused(true);
    expect(renderer.isPaused).toBe(true);

    // User switches back to desktop
    renderer.setPaused(false);
    expect(renderer.isPaused).toBe(false);

    renderer.dispose();
  });

  it('dynamically switches preset scenes via system tray commands', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(1000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    expect(renderer.currentScene.meta.id).toBe('triangle-prism');

    // Switch to Windows 11 logo
    renderer.setScene(PRESET_SCENES['windows-11']!);
    expect(renderer.currentScene.meta.id).toBe('windows-11');

    // Switch to Tux logo
    renderer.setScene(PRESET_SCENES['tux-prism']!);
    expect(renderer.currentScene.meta.id).toBe('tux-prism');

    renderer.dispose();
  });

  it('adjusts performance parameters (fps cap, resolution scale) via tray commands without errors', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(1000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    expect(() => {
      renderer.setFpsCap(15);
      renderer.setFpsCap(60);
      renderer.setResolutionScale(0.5);
      renderer.setResolutionScale(1.0);
    }).not.toThrow();

    renderer.dispose();
  });

  it('triggers click actions when clicking inside desktop shape silhouette', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(1000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    const initialPalette = renderer.getActivePaletteIndex();

    // Verify CPU hit-test returns object for center coordinate
    const hitResult = renderer.handleClick(0.5, 0.5);
    expect(hitResult).toBe('object');

    // Trigger click input event through HostInput
    input.emitPointerDown(0.5, 0.5);

    // Palette index advanced by next-palette action
    expect(renderer.getActivePaletteIndex()).not.toBe(initialPalette);

    renderer.dispose();
  });

  it('handles Linux host input and battery saver power pause signals', () => {
    const canvas = createMockCanvas();
    const input = new HostInput();
    const clock = new ManualClock(2000);

    const renderer = createRenderer({
      canvas,
      scene: triangleScene,
      input,
      clock,
    });

    // Start running
    renderer.start();
    expect(renderer.isRunning).toBe(true);
    expect(renderer.isPaused).toBe(false);

    // Simulate Linux host battery saver signal
    renderer.setPaused(true);
    expect(renderer.isPaused).toBe(true);

    // Simulate Linux pointer movement while paused (should track target)
    input.emitPointerMove(0.2, 0.8);
    const target = renderer.getTargetCursorPosition();
    expect(target[0]).toBeCloseTo(0.2);
    expect(target[1]).toBeCloseTo(0.8);

    // Resume when AC power restored
    renderer.setPaused(false);
    expect(renderer.isPaused).toBe(false);

    renderer.dispose();
  });
});
