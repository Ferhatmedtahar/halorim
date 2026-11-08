import { Scene, parseScene, type ClickActionItem, type Shape } from '@glowframe/schema';
import type { Renderer, RendererOptions, InputSource, Clock, UniformState } from './types.js';
import { SystemClock } from './clock.js';
import { NoopInput } from './input/noop.js';
import { getWebGL2Context } from './gl/context.js';
import { createQuadMesh, type QuadMesh } from './gl/quad.js';
import { createR8Texture, createRgbaTexture, type GlTexture } from './gl/texture.js';
import { rasterizeCenterContent, type ContentTextureResult } from './content/rasterize.js';
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
import {
  BASE_MODES,
  ALL_BASE_MODE_IDS,
  type BaseModeId,
  type BaseModeDefinition,
  type ModeUniforms,
  type EffectContext,
  type ActiveRipple,
  type ActiveBurst,
} from './effects/index.js';

function getShapeType(shape: Shape): number {
  if (shape.type === 'preset') {
    if (shape.preset === 'triangle') return 1;
    if (shape.preset === 'circle') return 2;
    if (shape.preset === 'hexagon') return 3;
  }
  return 0;
}

export function createRenderer(options: RendererOptions): Renderer {
  const { canvas } = options;
  let currentScene = parseScene(options.scene);
  const clock: Clock = options.clock ?? new SystemClock();
  const input: InputSource = options.input ?? new NoopInput();

  let isRunning = false;
  let isPaused = false;
  let isContextLost = false;
  let isCanvasVisible = true;
  let rafId: number | null = null;
  let lastFrameTime = 0;

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

  let pointerActive = false;
  let targetPointerX = 0.5;
  let targetPointerY = 0.5;
  let currentPointerX = 0.5;
  let currentPointerY = 0.5;
  let lastPointerTime = clock.now();
  let lastAnimTime = clock.now();
  let isOrbiting = false;
  let hoverTransition = 0.0;
  let currentPaletteIndex = 0;

  let activeModeId: string = currentScene.mode.id;
  let activeModeParams: Record<string, unknown> = currentScene.mode.params || {};
  let activeRipple: ActiveRipple | null = null;
  let activeBurst: ActiveBurst | null = null;
  let isContentVisible = true;

  const modeUniforms: ModeUniforms = {
    pulseFactor: 1.0,
    rotationSpeed: 0.0,
    hueShift: 0.0,
    flickerFactor: 1.0,
    sweep: [0, 0.08, 1.8, 0],
    orbitPos: null,
  };

  const effectContext: EffectContext = {
    timeSec: 0,
    timeMs: 0,
    shapeCenter: [0.5, 0.52],
    shapeScale: 0.28,
  };

  const paletteBuffer = new Float32Array(32);
  const fillColorBuffer = new Float32Array(3);
  const bgColorBuffer = new Float32Array(3);
  const sweepBuffer = new Float32Array(4);
  const rippleBuffer = new Float32Array(4);
  const contentTintBuffer = new Float32Array(4);
  const tempLinearRgb: [number, number, number] = [0, 0, 0];
  const paletteSprings = createPaletteSprings(8);
  let activePaletteOklab: ColorOKLab[] = [];
  let paletteStopCount = 0;

  const currentUniforms: UniformState = {
    u_cursorPos: [0.5, 0.5],
    u_hasCursor: 0,
    u_cursorSharpness: 3.0,
    u_hazeIntensity: 0.6,
    u_hoverTransition: 0.0,
    u_lightAngle: 0.0,
    u_shapeType: getShapeType(currentScene.shape),
    u_shapePos: [0.5, 0.52],
    u_shapeScale: 0.28,
    u_shapeRotation: 0,
    u_maxDistance: 96,
    u_edgeWidth: 0.004,
    u_edgeFalloff: 0.09,
    u_edgeIntensity: 1.0,
    u_edgeDispersion: 0.35,
    u_time: 0,
    u_rotationSpeed: 0,
    u_pulseFactor: 1.0,
    u_hueShift: 0,
    u_flickerFactor: 1.0,
    u_sweep: [0, 0.08, 1.8, 0],
    u_ripple: [0.5, 0.5, 0, 0],
    u_burstFactor: 0,
    u_hasContent: 0,
  };

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
  let contentResult: ContentTextureResult = rasterizeCenterContent(currentScene.fill.content);
  let contentTexture: GlTexture = createRgbaTexture(
    gl,
    contentResult.width,
    contentResult.height,
    contentResult.data,
  );

  function refreshColors(scene: Scene, immediate: boolean = true): void {
    const rawFill = parseColorToLinearSrgb(scene.fill.color);
    fillColorBuffer[0] = rawFill[0];
    fillColorBuffer[1] = rawFill[1];
    fillColorBuffer[2] = rawFill[2];

    const rawBg = parseColorToLinearSrgb(scene.background.color);
    bgColorBuffer[0] = rawBg[0];
    bgColorBuffer[1] = rawBg[1];
    bgColorBuffer[2] = rawBg[2];

    const currentPalette = scene.palettes[currentPaletteIndex] ??
      scene.palettes[0] ?? ['#ffffff', '#000000'];
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

  function screenToShapeUv(x: number, y: number): [number, number] {
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
    return [shapeU, shapeV];
  }

  function hitTestScreen(x: number, y: number): 'object' | 'background' {
    const [shapeU, shapeV] = screenToShapeUv(x, y);
    const distance = shapePipeline.hitTest(shapeU, shapeV);
    return distance < 0 ? 'object' : 'background';
  }

  function executeAction(
    item: ClickActionItem,
    _screenPos?: [number, number],
    shapePos?: [number, number],
  ): void {
    const action = item.action;
    const params = (item.params || {}) as Record<string, unknown>;

    if (action === 'next-palette') {
      if (currentScene.palettes.length > 0) {
        currentPaletteIndex = (currentPaletteIndex + 1) % currentScene.palettes.length;
        const pal = currentScene.palettes[currentPaletteIndex]!;
        activePaletteOklab = pal.map((c) => parseColorToOklab(c));
        paletteStopCount = Math.min(8, activePaletteOklab.length);
        setSpringTargets(paletteSprings, activePaletteOklab);
      }
    } else if (action === 'random-palette') {
      activePaletteOklab = generateRandomPalette();
      paletteStopCount = Math.min(8, activePaletteOklab.length);
      setSpringTargets(paletteSprings, activePaletteOklab);
    } else if (action === 'burst') {
      const intensity = typeof params['intensity'] === 'number' ? params['intensity'] : 2.0;
      const decay = typeof params['decay'] === 'number' ? params['decay'] : 4.0;
      const duration = typeof params['duration'] === 'number' ? params['duration'] : 0.5;
      activeBurst = {
        startTime: clock.now(),
        duration,
        intensity,
        decay,
      };
    } else if (action === 'ripple') {
      const originU = shapePos ? shapePos[0] : 0.5;
      const originV = shapePos ? shapePos[1] : 0.5;
      const speed = typeof params['speed'] === 'number' ? params['speed'] : 1.5;
      const duration = typeof params['duration'] === 'number' ? params['duration'] : 0.6;
      const intensity = typeof params['intensity'] === 'number' ? params['intensity'] : 1.5;
      activeRipple = {
        originU,
        originV,
        startTime: clock.now(),
        duration,
        speed,
        intensity,
      };
    } else if (action === 'next-mode') {
      const modeList = Array.isArray(params['modes'])
        ? (params['modes'] as BaseModeId[])
        : ALL_BASE_MODE_IDS;
      const currentIdx = modeList.indexOf(activeModeId as BaseModeId);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % modeList.length : 0;
      activeModeId = modeList[nextIdx]!;
      activeModeParams = {};
    } else if (action === 'toggle-content') {
      isContentVisible = !isContentVisible;
    }
  }

  function updateCanvasDimensions(): void {
    const physWidth = Math.max(1, Math.round(cssWidth * dpr * resolutionScale));
    const physHeight = Math.max(1, Math.round(cssHeight * dpr * resolutionScale));

    if (canvas.width !== physWidth || canvas.height !== physHeight) {
      canvas.width = physWidth;
      canvas.height = physHeight;
    }
  }

  updateCanvasDimensions();

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

      const [shapeU, shapeV] = screenToShapeUv(x, y);
      const distance = shapePipeline.hitTest(shapeU, shapeV);
      const hit = distance < 0 ? 'object' : 'background';
      const actionList =
        hit === 'object' ? currentScene.onClick.object : currentScene.onClick.background;
      for (let i = 0; i < actionList.length; i++) {
        executeAction(actionList[i]!, [x, y], [shapeU, shapeV]);
      }
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
      contentTexture = createRgbaTexture(
        gl,
        contentResult.width,
        contentResult.height,
        contentResult.data,
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

  function renderFrame(timeMs?: number): void {
    if (isContextLost) return;

    const now = timeMs !== undefined ? timeMs : clock.now();
    const timeSec = now * 0.001;

    const dt = Math.max(0, (now - lastAnimTime) * 0.001);
    lastAnimTime = now;
    stepPaletteSprings(paletteSprings, paletteStopCount, dt);

    for (let i = 0; i < paletteStopCount; i++) {
      const s = paletteSprings[i]!;
      oklabToLinearSrgb(s.L, s.a, s.b, tempLinearRgb);
      const baseIdx = i * 4;
      paletteBuffer[baseIdx] = tempLinearRgb[0];
      paletteBuffer[baseIdx + 1] = tempLinearRgb[1];
      paletteBuffer[baseIdx + 2] = tempLinearRgb[2];
      paletteBuffer[baseIdx + 3] = s.alpha;
    }

    effectContext.timeSec = timeSec;
    effectContext.timeMs = now;
    effectContext.shapeCenter[0] = currentScene.shape.position[0];
    effectContext.shapeCenter[1] = currentScene.shape.position[1];
    effectContext.shapeScale = currentScene.shape.scale;

    const modeDef =
      (BASE_MODES as Record<string, BaseModeDefinition<Record<string, unknown>>>)[activeModeId] ??
      BASE_MODES.glow;
    modeDef.evaluate(activeModeParams, effectContext, modeUniforms);

    if (activeRipple !== null) {
      const elapsed = (now - activeRipple.startTime) * 0.001;
      if (elapsed >= activeRipple.duration || elapsed < 0) {
        activeRipple = null;
        rippleBuffer[0] = 0.5;
        rippleBuffer[1] = 0.5;
        rippleBuffer[2] = 0.0;
        rippleBuffer[3] = 0.0;
      } else {
        const progress = elapsed / activeRipple.duration;
        rippleBuffer[0] = activeRipple.originU;
        rippleBuffer[1] = activeRipple.originV;
        rippleBuffer[2] = elapsed * activeRipple.speed;
        rippleBuffer[3] = (1.0 - progress) * activeRipple.intensity;
      }
    } else {
      rippleBuffer[0] = 0.5;
      rippleBuffer[1] = 0.5;
      rippleBuffer[2] = 0.0;
      rippleBuffer[3] = 0.0;
    }

    let burstFactor = 0.0;
    if (activeBurst !== null) {
      const elapsed = (now - activeBurst.startTime) * 0.001;
      if (elapsed >= activeBurst.duration || elapsed < 0) {
        activeBurst = null;
      } else {
        burstFactor = activeBurst.intensity * Math.exp(-activeBurst.decay * elapsed);
      }
    }

    const timeSinceLastPointer = now - lastPointerTime;
    const idleTimeout = currentScene.interaction.idleTimeoutMs ?? 3000;
    const isExplicitOrbitMode = modeUniforms.orbitPos !== null;
    const shouldIdleOrbit =
      !isExplicitOrbitMode &&
      currentScene.interaction.idleOrbit &&
      (!pointerActive || timeSinceLastPointer > idleTimeout);
    isOrbiting = isExplicitOrbitMode || shouldIdleOrbit;

    if (isExplicitOrbitMode && modeUniforms.orbitPos) {
      targetPointerX = modeUniforms.orbitPos[0];
      targetPointerY = modeUniforms.orbitPos[1];
    } else if (shouldIdleOrbit) {
      const orbitSpeed = 0.8;
      const orbitAngle = timeSec * orbitSpeed;
      const shapeCenter = currentScene.shape.position;
      const orbitRadius = currentScene.shape.scale * 1.3;
      targetPointerX = shapeCenter[0] + Math.cos(orbitAngle) * orbitRadius;
      targetPointerY = shapeCenter[1] + Math.sin(orbitAngle) * orbitRadius;
    }

    const smoothing = currentScene.interaction.smoothing;
    currentPointerX += (targetPointerX - currentPointerX) * smoothing;
    currentPointerY += (targetPointerY - currentPointerY) * smoothing;

    const hasCursor =
      isExplicitOrbitMode ||
      (currentScene.interaction.followCursor && (pointerActive || shouldIdleOrbit))
        ? 1.0
        : 0.0;

    const aspect = canvas.width / Math.max(canvas.height, 1);
    const shapeX = currentScene.shape.position[0];
    const shapeY = currentScene.shape.position[1];
    const dx = (currentPointerX - shapeX) * aspect;
    const dy = currentPointerY - shapeY;

    const hoverTarget = pointerActive ? 1.0 : 0.0;
    const hoverAlpha = dt > 0 ? 1.0 - Math.exp(-dt / 0.25) : 1.0;
    hoverTransition += (hoverTarget - hoverTransition) * hoverAlpha;
    hoverTransition = Math.max(0, Math.min(1, hoverTransition));

    const rotSpeed = modeUniforms.rotationSpeed;
    const autoAngle = rotSpeed !== 0 ? (timeSec * rotSpeed * Math.PI * 2) % (Math.PI * 2) : 0.0;
    let activeLightAngle = autoAngle;
    if (hoverTransition > 0.001) {
      const cursorAngle = Math.atan2(dy, dx);
      let angleDiff = (cursorAngle - autoAngle) % (Math.PI * 2);
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      activeLightAngle = autoAngle + angleDiff * hoverTransition;
    }

    sweepBuffer[0] = modeUniforms.sweep[0];
    sweepBuffer[1] = modeUniforms.sweep[1];
    sweepBuffer[2] = modeUniforms.sweep[2];
    sweepBuffer[3] = modeUniforms.sweep[3];

    currentUniforms.u_cursorPos[0] = currentPointerX;
    currentUniforms.u_cursorPos[1] = currentPointerY;
    currentUniforms.u_hasCursor = hasCursor;
    currentUniforms.u_hoverTransition = hoverTransition;
    currentUniforms.u_lightAngle = activeLightAngle;
    currentUniforms.u_shapeType = getShapeType(currentScene.shape);
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
    currentUniforms.u_rotationSpeed = modeUniforms.rotationSpeed;
    currentUniforms.u_pulseFactor = modeUniforms.pulseFactor;
    currentUniforms.u_hueShift = modeUniforms.hueShift;
    currentUniforms.u_flickerFactor = modeUniforms.flickerFactor;
    currentUniforms.u_sweep[0] = sweepBuffer[0];
    currentUniforms.u_sweep[1] = sweepBuffer[1];
    currentUniforms.u_sweep[2] = sweepBuffer[2];
    currentUniforms.u_sweep[3] = sweepBuffer[3];
    currentUniforms.u_ripple[0] = rippleBuffer[0];
    currentUniforms.u_ripple[1] = rippleBuffer[1];
    currentUniforms.u_ripple[2] = rippleBuffer[2];
    currentUniforms.u_ripple[3] = rippleBuffer[3];
    currentUniforms.u_burstFactor = burstFactor;

    const hasContent = isContentVisible && currentScene.fill.content !== null ? 1.0 : 0.0;
    currentUniforms.u_hasContent = hasContent;

    contentTintBuffer[0] = contentResult.tint[0];
    contentTintBuffer[1] = contentResult.tint[1];
    contentTintBuffer[2] = contentResult.tint[2];
    contentTintBuffer[3] = contentResult.tint[3];

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    program.use();
    sdfTexture.bind(0);
    contentTexture.bind(1);

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

    const uShapeTypeLoc = program.getUniformLocation('u_shapeType');
    if (uShapeTypeLoc) gl.uniform1i(uShapeTypeLoc, currentUniforms.u_shapeType);

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
    if (uRotSpeedLoc) gl.uniform1f(uRotSpeedLoc, modeUniforms.rotationSpeed);

    const uPulseLoc = program.getUniformLocation('u_pulseFactor');
    if (uPulseLoc) gl.uniform1f(uPulseLoc, modeUniforms.pulseFactor);

    const uHueShiftLoc = program.getUniformLocation('u_hueShift');
    if (uHueShiftLoc) gl.uniform1f(uHueShiftLoc, modeUniforms.hueShift);

    const uFlickerLoc = program.getUniformLocation('u_flickerFactor');
    if (uFlickerLoc) gl.uniform1f(uFlickerLoc, modeUniforms.flickerFactor);

    const uSweepLoc = program.getUniformLocation('u_sweep');
    if (uSweepLoc) gl.uniform4fv(uSweepLoc, sweepBuffer);

    const uRippleLoc = program.getUniformLocation('u_ripple');
    if (uRippleLoc) gl.uniform4fv(uRippleLoc, rippleBuffer);

    const uBurstLoc = program.getUniformLocation('u_burstFactor');
    if (uBurstLoc) gl.uniform1f(uBurstLoc, burstFactor);

    const uCursorPosLoc = program.getUniformLocation('u_cursorPos');
    if (uCursorPosLoc) gl.uniform2f(uCursorPosLoc, currentPointerX, currentPointerY);

    const uHoverLoc = program.getUniformLocation('u_hoverTransition');
    if (uHoverLoc) gl.uniform1f(uHoverLoc, hoverTransition);

    const uLightAngleLoc = program.getUniformLocation('u_lightAngle');
    if (uLightAngleLoc) gl.uniform1f(uLightAngleLoc, activeLightAngle);

    const uCursorSharpLoc = program.getUniformLocation('u_cursorSharpness');
    if (uCursorSharpLoc) gl.uniform1f(uCursorSharpLoc, currentScene.interaction.sharpness);

    const uHazeLoc = program.getUniformLocation('u_hazeIntensity');
    if (uHazeLoc) gl.uniform1f(uHazeLoc, currentScene.background.haze.intensity);

    const uHasCursorLoc = program.getUniformLocation('u_hasCursor');
    if (uHasCursorLoc) gl.uniform1f(uHasCursorLoc, hasCursor);

    const uContentTexLoc = program.getUniformLocation('u_contentTexture');
    if (uContentTexLoc) gl.uniform1i(uContentTexLoc, 1);

    const uHasContentLoc = program.getUniformLocation('u_hasContent');
    if (uHasContentLoc) gl.uniform1f(uHasContentLoc, hasContent);

    const uContentScaleLoc = program.getUniformLocation('u_contentScale');
    if (uContentScaleLoc) gl.uniform1f(uContentScaleLoc, contentResult.scale);

    const uContentOpacityLoc = program.getUniformLocation('u_contentOpacity');
    if (uContentOpacityLoc) gl.uniform1f(uContentOpacityLoc, contentResult.opacity);

    const uContentTintLoc = program.getUniformLocation('u_contentTint');
    if (uContentTintLoc) gl.uniform4fv(uContentTintLoc, contentTintBuffer);

    quad.draw();
  }

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
      activeModeId = currentScene.mode.id;
      activeModeParams = currentScene.mode.params || {};
      activeRipple = null;
      activeBurst = null;

      refreshColors(currentScene);
      shapePipeline = buildShapePipeline(currentScene.shape);
      sdfTexture.updateData(
        shapePipeline.sdf.width,
        shapePipeline.sdf.height,
        shapePipeline.sdf.r8Data,
      );
      contentResult = rasterizeCenterContent(currentScene.fill.content);
      contentTexture.updateData(contentResult.width, contentResult.height, contentResult.data);
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
      contentTexture.dispose();
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

    handleClick(x: number, y: number): 'object' | 'background' {
      return hitTestScreen(x, y);
    },

    getActivePaletteIndex(): number {
      return currentPaletteIndex;
    },

    getActiveMode(): string {
      return activeModeId;
    },

    setMode(id: string, params?: Record<string, unknown>): void {
      activeModeId = id;
      activeModeParams = params || {};
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },

    triggerAction(
      actionId: string,
      params?: Record<string, unknown>,
      origin?: [number, number],
    ): void {
      let shapePos: [number, number] | undefined;
      if (origin) {
        shapePos = screenToShapeUv(origin[0], origin[1]);
      }
      executeAction({ action: actionId, params }, origin, shapePos);
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },

    isContentVisible(): boolean {
      return isContentVisible;
    },
  };
}
