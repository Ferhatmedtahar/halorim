import { Scene, parseScene, type ClickActionItem } from '@glowframe/schema';
import type { Renderer, RendererOptions, InputSource, Clock, UniformState } from './types.js';
import { SystemClock } from './clock.js';
import { NoopInput } from './input/noop.js';
import { getWebGL2Context } from './gl/context.js';
import { createQuadMesh, type QuadMesh } from './gl/quad.js';
import { createR8Texture, type GlTexture } from './gl/texture.js';
import { createShaderProgram, type ShaderProgram } from './gl/program.js';
import { QUAD_VERTEX_SHADER } from './shaders/quad.vert.js';
import { GLOW_FRAGMENT_SHADER } from './shaders/glow.frag.js';
import { buildShapePipeline, type ShapePipelineResult } from './shape/pipeline.js';
import {
  parseColorToLinearSrgb,
  parseColorToOklab,
  oklabToLinearSrgb,
  type ColorOKLab,
} from './color/oklch.js';
import {
  createPaletteSprings,
  setSpringTargetsImmediate,
  setSpringTargets,
  stepPaletteSprings,
  generateRandomPalette,
} from './color/spring.js';

export function createRenderer(options: RendererOptions): Renderer {
  const { canvas } = options;
  let currentScene = parseScene(options.scene);
  const clock: Clock = options.clock ?? new SystemClock();
  const input: InputSource = options.input ?? new NoopInput();

  // Internal state
  let isRunning = false;
  let isPaused = false;
  let isContextLost = false;
  let isCanvasVisible = true;
  let rafId: number | null = null;
  let lastFrameTime = 0;

  // Configuration parameters
  let fpsCap = currentScene.performance.fpsCap;
  let resolutionScale = currentScene.performance.resolutionScale;
  let cssWidth =
    typeof (canvas as HTMLCanvasElement).clientWidth === 'number' &&
    (canvas as HTMLCanvasElement).clientWidth > 0
      ? (canvas as HTMLCanvasElement).clientWidth
      : canvas.width || 800;
  let cssHeight =
    typeof (canvas as HTMLCanvasElement).clientHeight === 'number' &&
    (canvas as HTMLCanvasElement).clientHeight > 0
      ? (canvas as HTMLCanvasElement).clientHeight
      : canvas.height || 600;
  let dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;

  // Interaction & cursor tracking
  let pointerActive = false;
  let targetPointerX = 0.5;
  let targetPointerY = 0.5;
  let currentPointerX = 0.5;
  let currentPointerY = 0.5;
  let lastPointerTime = clock.now();
  let lastAnimTime = clock.now();
  let isOrbiting = false;
  let currentPaletteIndex = 0;

  // Pre-allocated flat buffers for uniform upload (ZERO allocations inside render loop)
  const paletteBuffer = new Float32Array(32); // 8 vec4s
  const fillColorBuffer = new Float32Array(3);
  const bgColorBuffer = new Float32Array(3);
  const tempLinearRgb: [number, number, number] = [0, 0, 0];
  const paletteSprings = createPaletteSprings(8);
  let activePaletteOklab: ColorOKLab[] = [];
  let paletteStopCount = 0;

  // Pre-allocated uniform state tracking (for tests and inspection without GC pressure)
  const currentUniforms: UniformState = {
    u_cursorPos: [0.5, 0.5],
    u_hasCursor: 0,
    u_cursorSharpness: 3.0,
    u_hazeIntensity: 0.6,
    u_shapePos: [0.5, 0.52],
    u_shapeScale: 0.28,
    u_shapeRotation: 0,
    u_maxDistance: 96,
    u_edgeWidth: 0.004,
    u_edgeFalloff: 0.09,
    u_edgeIntensity: 1.0,
    u_edgeDispersion: 0.35,
    u_time: 0,
  };

  // WebGL resources
  let gl: WebGL2RenderingContext = getWebGL2Context(canvas);
  let quad: QuadMesh = createQuadMesh(gl);
  let program: ShaderProgram = createShaderProgram(gl, QUAD_VERTEX_SHADER, GLOW_FRAGMENT_SHADER);
  let shapePipeline: ShapePipelineResult = buildShapePipeline(currentScene.shape);
  let sdfTexture: GlTexture = createR8Texture(
    gl,
    shapePipeline.sdf.width,
    shapePipeline.sdf.height,
    shapePipeline.sdf.r8Data,
  );

  // Update color caches from scene
  function refreshColors(scene: Scene, immediate: boolean = true): void {
    const rawFill = parseColorToLinearSrgb(scene.fill.color);
    fillColorBuffer[0] = rawFill[0];
    fillColorBuffer[1] = rawFill[1];
    fillColorBuffer[2] = rawFill[2];

    const rawBg = parseColorToLinearSrgb(scene.background.color);
    bgColorBuffer[0] = rawBg[0];
    bgColorBuffer[1] = rawBg[1];
    bgColorBuffer[2] = rawBg[2];

    const currentPalette = scene.palettes[currentPaletteIndex] ?? scene.palettes[0] ?? ['#ffffff', '#000000'];
    activePaletteOklab = currentPalette.map((c) => parseColorToOklab(c));
    paletteStopCount = Math.min(8, currentPalette.length);

    if (immediate) {
      setSpringTargetsImmediate(paletteSprings, activePaletteOklab);
    } else {
      setSpringTargets(paletteSprings, activePaletteOklab);
    }

    for (let i = 0; i < paletteStopCount; i++) {
      const s = paletteSprings[i]!;
      oklabToLinearSrgb(s.L, s.a, s.b, tempLinearRgb);
      const baseIdx = i * 4;
      paletteBuffer[baseIdx] = tempLinearRgb[0];
      paletteBuffer[baseIdx + 1] = tempLinearRgb[1];
      paletteBuffer[baseIdx + 2] = tempLinearRgb[2];
      paletteBuffer[baseIdx + 3] = s.alpha;
    }
  }

  refreshColors(currentScene, true);

  function hitTestScreen(x: number, y: number): 'object' | 'background' {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const diffX = (x - currentScene.shape.position[0]) * aspect;
    const diffY = y - currentScene.shape.position[1];
    const rotRad = (currentScene.shape.rotation * Math.PI) / 180;
    const cosR = Math.cos(-rotRad);
    const sinR = Math.sin(-rotRad);
    const rotX = diffX * cosR - diffY * sinR;
    const rotY = diffX * sinR + diffY * cosR;
    const safeScale = Math.max(currentScene.shape.scale, 0.001);
    const shapeU = rotX / safeScale + 0.5;
    const shapeV = rotY / safeScale + 0.5;
    const distance = shapePipeline.hitTest(shapeU, shapeV);
    return distance < 0 ? 'object' : 'background';
  }

  function executeAction(item: ClickActionItem): void {
    if (item.action === 'next-palette') {
      if (currentScene.palettes.length > 0) {
        currentPaletteIndex = (currentPaletteIndex + 1) % currentScene.palettes.length;
        const pal = currentScene.palettes[currentPaletteIndex]!;
        activePaletteOklab = pal.map((c) => parseColorToOklab(c));
        paletteStopCount = Math.min(8, activePaletteOklab.length);
        setSpringTargets(paletteSprings, activePaletteOklab);
      }
    } else if (item.action === 'random-palette') {
      activePaletteOklab = generateRandomPalette();
      paletteStopCount = Math.min(8, activePaletteOklab.length);
      setSpringTargets(paletteSprings, activePaletteOklab);
    }
  }

  // Apply canvas buffer dimensions
  function updateCanvasDimensions(): void {
    const physWidth = Math.max(1, Math.round(cssWidth * dpr * resolutionScale));
    const physHeight = Math.max(1, Math.round(cssHeight * dpr * resolutionScale));

    if (canvas.width !== physWidth || canvas.height !== physHeight) {
      canvas.width = physWidth;
      canvas.height = physHeight;
    }
  }

  updateCanvasDimensions();

  // Input source handlers
  const unsubscribeInput = input.subscribe({
    onPointerMove(x: number, y: number): void {
      targetPointerX = x;
      targetPointerY = y;
      pointerActive = true;
      lastPointerTime = clock.now();
    },
    onPointerDown(x: number, y: number): void {
      targetPointerX = x;
      targetPointerY = y;
      pointerActive = true;
      lastPointerTime = clock.now();
    },
    onPointerLeave(): void {
      pointerActive = false;
    },
    onVisibilityChange(visible: boolean): void {
      isCanvasVisible = visible;
      if (visible && isRunning && !isPaused && rafId === null) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    },
  });

  // WebGL Context Loss / Restoration listeners
  const onContextLost = (e: Event): void => {
    e.preventDefault();
    isContextLost = true;
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const onContextRestored = (): void => {
    isContextLost = false;
    try {
      gl = getWebGL2Context(canvas);
      quad = createQuadMesh(gl);
      program = createShaderProgram(gl, QUAD_VERTEX_SHADER, GLOW_FRAGMENT_SHADER);
      sdfTexture = createR8Texture(
        gl,
        shapePipeline.sdf.width,
        shapePipeline.sdf.height,
        shapePipeline.sdf.r8Data,
      );
      if (isRunning && !isPaused) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    } catch {
      // Failed to restore context
    }
  };

  const htmlCanvas = canvas as HTMLCanvasElement;
  if (typeof htmlCanvas.addEventListener === 'function') {
    htmlCanvas.addEventListener('webglcontextlost', onContextLost as EventListener, false);
    htmlCanvas.addEventListener('webglcontextrestored', onContextRestored as EventListener, false);
  }

  // Single render frame execution
  function renderFrame(timeMs?: number): void {
    if (isContextLost) return;

    const now = timeMs !== undefined ? timeMs : clock.now();
    const timeSec = now * 0.001;

    // Handle idle pointer orbit
    const timeSinceLastPointer = now - lastPointerTime;
    const idleTimeout = currentScene.interaction.idleTimeoutMs ?? 3000;
    const shouldIdleOrbit =
      currentScene.interaction.idleOrbit && (!pointerActive || timeSinceLastPointer > idleTimeout);
    isOrbiting = shouldIdleOrbit;

    if (shouldIdleOrbit) {
      const orbitSpeed = 0.8;
      const orbitAngle = timeSec * orbitSpeed;
      const shapeCenter = currentScene.shape.position;
      const orbitRadius = currentScene.shape.scale * 1.3;
      targetPointerX = shapeCenter[0] + Math.cos(orbitAngle) * orbitRadius;
      targetPointerY = shapeCenter[1] + Math.sin(orbitAngle) * orbitRadius;
    }

    // Smooth pointer interpolation
    const smoothing = currentScene.interaction.smoothing;
    currentPointerX += (targetPointerX - currentPointerX) * smoothing;
    currentPointerY += (targetPointerY - currentPointerY) * smoothing;

    const hasCursor =
      currentScene.interaction.followCursor && (pointerActive || shouldIdleOrbit) ? 1.0 : 0.0;

    // Record uniforms
    currentUniforms.u_cursorPos[0] = currentPointerX;
    currentUniforms.u_cursorPos[1] = currentPointerY;
    currentUniforms.u_hasCursor = hasCursor;
    currentUniforms.u_cursorSharpness = currentScene.interaction.sharpness;
    currentUniforms.u_hazeIntensity = currentScene.background.haze.intensity;
    currentUniforms.u_shapePos[0] = currentScene.shape.position[0];
    currentUniforms.u_shapePos[1] = currentScene.shape.position[1];
    currentUniforms.u_shapeScale = currentScene.shape.scale;
    currentUniforms.u_shapeRotation = (currentScene.shape.rotation * Math.PI) / 180;
    currentUniforms.u_maxDistance = shapePipeline.sdf.maxDistance;
    currentUniforms.u_edgeWidth = currentScene.edge.width;
    currentUniforms.u_edgeFalloff = currentScene.edge.falloff;
    currentUniforms.u_edgeIntensity = currentScene.edge.intensity;
    currentUniforms.u_edgeDispersion = currentScene.edge.dispersion;
    currentUniforms.u_time = timeSec;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    program.use();
    sdfTexture.bind(0);

    // Set uniform values
    const uSdfLoc = program.getUniformLocation('u_sdf');
    if (uSdfLoc) gl.uniform1i(uSdfLoc, 0);

    const uResLoc = program.getUniformLocation('u_resolution');
    if (uResLoc) gl.uniform2f(uResLoc, canvas.width, canvas.height);

    const uShapePosLoc = program.getUniformLocation('u_shapePos');
    if (uShapePosLoc)
      gl.uniform2f(uShapePosLoc, currentScene.shape.position[0], currentScene.shape.position[1]);

    const uShapeScaleLoc = program.getUniformLocation('u_shapeScale');
    if (uShapeScaleLoc) gl.uniform1f(uShapeScaleLoc, currentScene.shape.scale);

    const uShapeRotLoc = program.getUniformLocation('u_shapeRotation');
    if (uShapeRotLoc) gl.uniform1f(uShapeRotLoc, (currentScene.shape.rotation * Math.PI) / 180);

    const uMaxDistLoc = program.getUniformLocation('u_maxDistance');
    if (uMaxDistLoc) gl.uniform1f(uMaxDistLoc, shapePipeline.sdf.maxDistance);

    const uEdgeWidthLoc = program.getUniformLocation('u_edgeWidth');
    if (uEdgeWidthLoc) gl.uniform1f(uEdgeWidthLoc, currentScene.edge.width);

    const uEdgeFalloffLoc = program.getUniformLocation('u_edgeFalloff');
    if (uEdgeFalloffLoc) gl.uniform1f(uEdgeFalloffLoc, currentScene.edge.falloff);

    const uEdgeIntensityLoc = program.getUniformLocation('u_edgeIntensity');
    if (uEdgeIntensityLoc) gl.uniform1f(uEdgeIntensityLoc, currentScene.edge.intensity);

    const uEdgeDispLoc = program.getUniformLocation('u_edgeDispersion');
    if (uEdgeDispLoc) gl.uniform1f(uEdgeDispLoc, currentScene.edge.dispersion);

    const uFillLoc = program.getUniformLocation('u_fillColor');
    if (uFillLoc) gl.uniform3fv(uFillLoc, fillColorBuffer);

    const uBgLoc = program.getUniformLocation('u_bgColor');
    if (uBgLoc) gl.uniform3fv(uBgLoc, bgColorBuffer);

    const uPalCountLoc = program.getUniformLocation('u_paletteCount');
    if (uPalCountLoc) gl.uniform1i(uPalCountLoc, paletteStopCount);

    const uPalLoc = program.getUniformLocation('u_palette[0]');
    if (uPalLoc) gl.uniform4fv(uPalLoc, paletteBuffer);

    const uTimeLoc = program.getUniformLocation('u_time');
    if (uTimeLoc) gl.uniform1f(uTimeLoc, timeSec);

    const uRotSpeedLoc = program.getUniformLocation('u_rotationSpeed');
    if (uRotSpeedLoc) gl.uniform1f(uRotSpeedLoc, 0.0);

    const uCursorPosLoc = program.getUniformLocation('u_cursorPos');
    if (uCursorPosLoc) gl.uniform2f(uCursorPosLoc, currentPointerX, currentPointerY);

    const uCursorSharpLoc = program.getUniformLocation('u_cursorSharpness');
    if (uCursorSharpLoc) gl.uniform1f(uCursorSharpLoc, currentScene.interaction.sharpness);

    const uHazeLoc = program.getUniformLocation('u_hazeIntensity');
    if (uHazeLoc) gl.uniform1f(uHazeLoc, currentScene.background.haze.intensity);

    const uHasCursorLoc = program.getUniformLocation('u_hasCursor');
    if (uHasCursorLoc) {
      const hasCursor =
        currentScene.interaction.followCursor && (pointerActive || shouldIdleOrbit) ? 1.0 : 0.0;
      gl.uniform1f(uHasCursorLoc, hasCursor);
    }

    quad.draw();
  }

  // Animation frame loop with fps cap
  function loop(): void {
    if (!isRunning || isPaused || !isCanvasVisible || isContextLost) {
      rafId = null;
      return;
    }

    const now = clock.now();
    const minFrameInterval = 1000 / Math.max(1, fpsCap);
    const elapsed = now - lastFrameTime;

    if (elapsed >= minFrameInterval) {
      lastFrameTime = now - (elapsed % minFrameInterval);
      renderFrame(now);
    }

    scheduleNextFrame();
  }

  function scheduleNextFrame(): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      rafId = requestAnimationFrame(loop);
    }
  }

  return {
    start(): void {
      if (isRunning) return;
      isRunning = true;
      lastFrameTime = clock.now();
      scheduleNextFrame();
    },

    stop(): void {
      isRunning = false;
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    setScene(newScene: Scene): void {
      currentScene = parseScene(newScene);
      fpsCap = currentScene.performance.fpsCap;
      resolutionScale = currentScene.performance.resolutionScale;

      refreshColors(currentScene);
      shapePipeline = buildShapePipeline(currentScene.shape);
      sdfTexture.updateData(
        shapePipeline.sdf.width,
        shapePipeline.sdf.height,
        shapePipeline.sdf.r8Data,
      );
      updateCanvasDimensions();

      if (!isRunning) {
        renderFrame(clock.now());
      }
    },

    setPaused(paused: boolean): void {
      isPaused = paused;
      if (!isPaused && isRunning && rafId === null) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    },

    setResolutionScale(scale: number): void {
      resolutionScale = Math.max(0.25, Math.min(1.0, scale));
      updateCanvasDimensions();
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },

    setFpsCap(fps: number): void {
      fpsCap = Math.max(10, Math.min(144, fps));
    },

    resize(width: number, height: number, devicePixelRatio?: number): void {
      cssWidth = width;
      cssHeight = height;
      if (devicePixelRatio !== undefined) {
        dpr = devicePixelRatio;
      }
      updateCanvasDimensions();
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },

    renderFrame(timeMs?: number): void {
      renderFrame(timeMs);
    },

    dispose(): void {
      isRunning = false;
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      unsubscribeInput();

      if (typeof htmlCanvas.removeEventListener === 'function') {
        htmlCanvas.removeEventListener('webglcontextlost', onContextLost as EventListener);
        htmlCanvas.removeEventListener('webglcontextrestored', onContextRestored as EventListener);
      }

      quad.dispose();
      sdfTexture.dispose();
      program.dispose();
    },

    get isRunning(): boolean {
      return isRunning;
    },

    get isPaused(): boolean {
      return isPaused;
    },

    get currentScene(): Scene {
      return currentScene;
    },

    getCursorPosition(): [number, number] {
      return [currentPointerX, currentPointerY];
    },

    getTargetCursorPosition(): [number, number] {
      return [targetPointerX, targetPointerY];
    },

    isIdleOrbitActive(): boolean {
      return isOrbiting;
    },

    getUniformValues(): Readonly<UniformState> {
      return currentUniforms;
    },
  };
}
