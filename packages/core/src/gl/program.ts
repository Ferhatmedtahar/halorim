import { RenderError } from '../errors.js';

export interface ShaderProgram {
  readonly program: WebGLProgram;
  use(): void;
  getUniformLocation(name: string): WebGLUniformLocation | null;
  dispose(): void;
}

export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): ShaderProgram {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  if (!vertShader || !fragShader) {
    if (vertShader) gl.deleteShader(vertShader);
    if (fragShader) gl.deleteShader(fragShader);
    throw new RenderError('Failed to allocate WebGL shader objects');
  }

  gl.shaderSource(vertShader, vertexSource);
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vertShader);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`Vertex shader compilation failed: ${info ?? 'unknown error'}`);
  }

  gl.shaderSource(fragShader, fragmentSource);
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragShader);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`Fragment shader compilation failed: ${info ?? 'unknown error'}`);
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError('Failed to allocate WebGL program object');
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`WebGL program link failed: ${info ?? 'unknown error'}`);
  }

  // Shaders can be detached and deleted once linked
  gl.detachShader(program, vertShader);
  gl.detachShader(program, fragShader);
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);

  const uniformCache = new Map<string, WebGLUniformLocation | null>();

  return {
    program,
    use(): void {
      gl.useProgram(program);
    },
    getUniformLocation(name: string): WebGLUniformLocation | null {
      if (uniformCache.has(name)) {
        return uniformCache.get(name)!;
      }
      const loc = gl.getUniformLocation(program, name);
      uniformCache.set(name, loc);
      return loc;
    },
    dispose(): void {
      uniformCache.clear();
      gl.deleteProgram(program);
    },
  };
}
