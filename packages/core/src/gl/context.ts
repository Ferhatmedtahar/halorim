import { UnsupportedError } from '../errors.js';

export function getWebGL2Context(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attrs?: WebGLContextAttributes,
): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
    ...attrs,
  }) as WebGL2RenderingContext | null;

  if (!gl) {
    throw new UnsupportedError(
      'WebGL2 is not supported or could not be initialized on this canvas',
    );
  }

  return gl;
}
