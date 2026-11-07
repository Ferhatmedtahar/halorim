export interface QuadMesh {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  draw(): void;
  dispose(): void;
}

export function createQuadMesh(gl: WebGL2RenderingContext): QuadMesh {
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();

  if (!vao || !vbo) {
    if (vao) gl.deleteVertexArray(vao);
    if (vbo) gl.deleteBuffer(vbo);
    throw new Error('Failed to allocate WebGL quad geometry buffers');
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // Fullscreen quad: two triangles
  // Positions: [x, y] in clip space
  const vertices = new Float32Array([
    -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Layout location 0 = a_position
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    vao,
    vbo,
    draw(): void {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    },
    dispose(): void {
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
    },
  };
}
