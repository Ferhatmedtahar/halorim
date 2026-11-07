export class UnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedError';
    Object.setPrototypeOf(this, UnsupportedError.prototype);
  }
}

export class WebGLContextLostError extends Error {
  constructor(message: string = 'WebGL2 context lost') {
    super(message);
    this.name = 'WebGLContextLostError';
    Object.setPrototypeOf(this, WebGLContextLostError.prototype);
  }
}

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
    Object.setPrototypeOf(this, RenderError.prototype);
  }
}
