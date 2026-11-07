export { createRenderer } from './renderer.js';

export type { Renderer, RendererOptions, InputSource, InputHandlers, Clock } from './types.js';

export { UnsupportedError, WebGLContextLostError, RenderError } from './errors.js';

export { exampleScene } from '@glowframe/schema';

export { SystemClock, ManualClock } from './clock.js';
export { BrowserInput, NoopInput } from './input/index.js';
export { buildShapePipeline, type ShapePipelineResult } from './shape/pipeline.js';
export { computeSdf, type SdfData } from './shape/edt.js';
export { rasterizeShape, getTriangleVertices } from './shape/rasterize.js';
export {
  parseColorToOklab,
  parseColorToLinearSrgb,
  samplePaletteLinear,
  oklabToLinearSrgb,
  linearSrgbToOklab,
  oklchToOklab,
} from './color/oklch.js';
