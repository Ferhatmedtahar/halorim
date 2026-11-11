export interface GlTexture {
  readonly texture: WebGLTexture;
  bind(unit?: number): void;
  updateData(width: number, height: number, data: Uint8Array | Float32Array): void;
  dispose(): void;
}

export function createR8Texture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Uint8Array,
): GlTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create WebGL texture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    bind(unit: number = 0): void {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },
    updateData(w: number, h: number, newData: Uint8Array | Float32Array): void {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, newData);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose(): void {
      gl.deleteTexture(texture);
    },
  };
}

/**
 * Single-channel half-float texture (R16F). Core WebGL2 supports linear filtering on R16F without
 * any extension, and half floats keep sub-pixel precision near zero where the rim line lives.
 */
export function createR16FTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Float32Array,
  channels: 1 | 2 = 1,
): GlTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create WebGL texture');
  }

  const upload = (w: number, h: number, d: Float32Array): void => {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (channels === 2) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.FLOAT, d);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.FLOAT, d);
    }
  };

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  upload(width, height, data);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    bind(unit: number = 0): void {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },
    updateData(w: number, h: number, newData: Uint8Array | Float32Array): void {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      upload(w, h, newData as Float32Array);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose(): void {
      gl.deleteTexture(texture);
    },
  };
}

export function createRgbaTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data?: Uint8Array | null,
): GlTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create WebGL RGBA texture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data ?? null,
  );

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    bind(unit: number = 0): void {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },
    updateData(w: number, h: number, newData: Uint8Array): void {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, newData);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose(): void {
      gl.deleteTexture(texture);
    },
  };
}
