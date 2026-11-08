export { createRenderer } from './renderer.js';

export type { Renderer, RendererOptions, InputSource, InputHandlers, Clock } from './types.js';

export {
  UnsupportedError,
  WebGLContextLostError,
  RenderError,
  AssetLoadError,
  ShapeRasterizationError,
} from './errors.js';

export { exampleScene } from '@glowframe/schema';

export { SystemClock, ManualClock } from './clock.js';
export { BrowserInput, NoopInput } from './input/index.js';
export {
  buildShapePipeline,
  buildShapePipelineAsync,
  type ShapePipelineResult,
} from './shape/pipeline.js';
export { computeSdf, type SdfData } from './shape/edt.js';
export { computeSdfAsync } from './shape/worker.js';
export {
  rasterizeShape,
  parseSvgString,
  getTriangleVertices,
  getStarVertices,
  getRegularPolygonVertices,
  rasterizePolygon,
  rasterizeCircle,
  rasterizeRoundedRect,
  type RasterizedMask,
} from './shape/rasterize.js';
export { rasterizeCenterContent, type ContentTextureResult } from './content/rasterize.js';
export {
  parseColorToOklab,
  parseColorToLinearSrgb,
  samplePaletteLinear,
  oklabToLinearSrgb,
  linearSrgbToOklab,
  oklchToOklab,
} from './color/oklch.js';
export {
  createPaletteSprings,
  setSpringTargets,
  setSpringTargetsImmediate,
  stepPaletteSprings,
  generateRandomPalette,
  type ColorStopSpring,
  type SpringConfig,
} from './color/spring.js';
export {
  BASE_MODES,
  CLICK_ACTIONS,
  ALL_BASE_MODE_IDS,
  ALL_CLICK_ACTION_IDS,
  type EffectContext,
  type ModeUniforms,
  type BaseModeDefinition,
  type ClickActionDefinition,
  type ActiveRipple,
  type ActiveBurst,
} from './effects/index.js';
