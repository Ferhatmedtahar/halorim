# Changelog

All notable changes to the Glowframe monorepo are documented in this file.

## [v0.9.0] - M9: Linux Desktop Runner (X11 & Wayland)

### Added

- **M9: Linux Desktop Runner (`apps/desktop/src-tauri/src/linux_host.rs`)**:
  - **Display Server Environment Detection**:
    - Automatic detection across X11, non-GNOME Wayland (Hyprland, Sway, River, Wayfire, KDE Plasma), and GNOME on Wayland sessions. Because the runner forces `GDK_BACKEND=x11`, all Wayland sessions take the XWayland path.
  - **X11 Desktop Window Hint Integration**:
    - Applies EWMH/NetWM desktop hints: `_NET_WM_WINDOW_TYPE_DESKTOP` and `_NET_WM_STATE_BELOW`.
    - Strips window decorations, sets skip taskbar/pager hints, maximizes across the monitor geometry, and lowers behind all desktop clients.
  - **Wayland Layer-Shell Architecture**:
    - Defines `WaylandLayerShellConfig` targeting `ZWLR_LAYER_SHELL_V1_LAYER_BACKGROUND` (Layer 0), with all 4 edge anchors (`15`), exclusive zone `-1` (no panel displacement), and zero keyboard interactivity.
    - _Correction:_ this config is not wired to any layer-shell implementation yet (no layer-shell crate is linked). KDE and wlroots compositors run through XWayland. Earlier docs said otherwise.
  - **GNOME on Wayland Fallback & Documentation**:
    - Transparently documents Mutter's lack of `wlr-layer-shell` support.
    - Implements graceful fallback to XWayland desktop mode with informative runtime logging.
    - Created `docs/LINUX.md` providing step-by-step setup for X11, Sway, Hyprland, KDE, GNOME on Xorg, `GDK_BACKEND=x11`, and GNOME Shell extensions.
  - **Power & Fullscreen Management**:
    - Evaluates ACPI platform profile (`power-saver` / `low-power`) and battery discharging state with low-capacity threshold (< 20%) via `/sys/class/power_supply`.
    - Automatically pauses WebGL render loop (`glowframe://set-paused`) when on battery saver or under fullscreen applications to minimize power consumption.
  - **Global Cursor & Click Tracking**:
    - Queries root window pointer position and button masks via GDK at ~60 Hz, normalizing coordinates to $[0, 1]$ and dispatching `glowframe://cursor-move` and `glowframe://cursor-down` to `@glowframe/core` via `HostInput`.
  - **Systemd User Service Integration**:
    - Documented systemd user service unit template (`~/.config/systemd/user/glowframe.service`) for running as a daemon on login.
  - **Test Suite**:
    - Added Rust unit test suite in `linux_host.rs` (10 tests passing across `windows_host` and `linux_host`) verifying display server detection, battery saver evaluation, coordinate normalization, X11 atom hints, and Wayland layer shell defaults.
    - Added TypeScript integration test in `apps/desktop/src/__tests__/desktop-runner.test.ts` (9 tests passing) testing Linux host input tracking and power save pause signals.
    - Verified cross-compilation across native Linux, `x86_64-pc-windows-gnu`, and `x86_64-pc-windows-msvc`.

## [v0.8.0] - M8: Windows Desktop Runner (Tauri)

### Added

- **M8: Windows Desktop Runner (`apps/desktop`)**:
  - **Tauri v2 Desktop Harness**:
    - Configured lightweight Tauri v2 app with transparent, borderless, frameless webview window (`apps/desktop/src-tauri`).
    - Webview harness (`apps/desktop/src/main.ts`) connects `@glowframe/core` with `HostInput` and listens for Tauri IPC events.
  - **WorkerW Desktop Window Parenting (`src-tauri/src/windows_host.rs`)**:
    - Dispatches Windows shell message `0x052C` to `Progman` to spawn the desktop `WorkerW` hierarchy.
    - Locates the sibling `WorkerW` behind desktop icons via `EnumWindows` and `FindWindowExW(SHELLDLL_DefView)`.
    - Parents the Tauri webview to `WorkerW` via `SetParent`, strips caption borders (`WS_CHILD | WS_CLIPSIBLINGS | WS_VISIBLE`), and positions at `HWND_BOTTOM`.
  - **Global Input & Cursor Tracking**:
    - Dedicated 60 Hz background thread continuously polls `GetCursorPos` across monitors, normalizes coordinates to $[0, 1]$, and emits `glowframe://cursor-move` events.
    - Detects global mouse clicks via `GetAsyncKeyState(VK_LBUTTON)` on leading edge and emits `glowframe://cursor-down`.
    - `HostInput` (`apps/desktop/src/host-input.ts`) implements `@glowframe/core`'s `InputSource` interface to bridge native IPC events directly into renderer springs and hit-testers.
  - **Fullscreen & Battery Saver Monitor**:
    - Background monitor evaluates foreground window bounds via `GetForegroundWindow`, `GetWindowRect`, and `GetMonitorInfoW` (excluding `Progman`).
    - Inspects `GetSystemPowerStatus` for Windows Battery Saver mode.
    - Dispatches `glowframe://set-paused` to stop WebGL render loop when a fullscreen window covers the primary monitor or battery saver is active.
  - **Native System Tray (`src-tauri/src/tray.rs`)**:
    - Presets menu: dynamic switching between all 6 preset scenes (`triangle-prism`, `tux-prism`, `four-pane`, `hexagon-prism`, `cyber-star`, `matrix-circle`).
    - FPS Cap menu: 15 fps (battery saving), 30 fps (balanced), 60 fps (smooth).
    - Resolution Scale menu: 0.5x (eco), 0.75x (balanced), 1.0x (full).
    - Pause / Resume toggle and Quit actions.
  - **Test Suite**:
    - Unit tests in `apps/desktop/src/__tests__/host-input.test.ts` (3 tests) verifying coordinate normalization and subscription dispatch.
    - Integration tests in `apps/desktop/src/__tests__/desktop-runner.test.ts` (5 tests) verifying renderer lifecycle, pause/resume signaling, IPC preset switching, and click actions.
    - Rust unit tests in `windows_host.rs` testing normalization math and payload serialization.
    - Verified cross-compilation with `cargo check --target x86_64-pc-windows-gnu` and `x86_64-pc-windows-msvc`.

## [v0.7.0] - M7: Export Engine and Wallpaper Library Site

### Added

- **M7: Export and Library Site**:
  - **Expanded Preset Catalog (`@glowframe/presets`)**:
    - Created 6 distinct, production-grade presets with complete metadata, tags, licensing, and color palettes:
      - `triangle-prism`: Reference equilateral triangle with prismatic edge glow.
      - `tux-prism`: Linux mascot Tux silhouette with prismatic edge illumination.
      - `four-pane`: Generic four-pane window silhouette with prismatic division lines.
      - `hexagon-prism`: Regular hexagon silhouette with pulsing breathing glow.
      - `cyber-star`: 5-pointed star with continuous scanning light beam sweep.
      - `matrix-circle`: Minimalist glowing ring with continuous emerald hue shifts.
  - **Export Engine (`@glowframe/export`)**:
    - `exportPng`: Renders high-resolution still frames (1080p FHD, 1440p QHD, 4K UHD, and custom) using synchronous render and readback within the same microtask, guaranteeing non-blank output.
    - `exportSceneJson`: Serializes and formats `.glowframe.json` wallpaper files.
    - `exportHtmlPack`: Generates standalone, offline-ready ZIP archives with `fflate@0.8.3` containing `index.html`, bundled core JS, `scene.json`, and `README.txt`. Runs completely offline without external network dependencies.
    - Added unit test suite in `packages/export/src/__tests__/export.test.ts` (4 tests).
    - Added headless WebGL2 E2E test suite in `packages/export/src/__tests__/export-e2e.test.ts` (3 tests) validating non-blank 4K PNG export (correct PNG signature and luminous glowing pixels) and 100% offline execution of unzipped HTML packs.
  - **Thumbnail Generator (`tooling/thumbnails`)**:
    - Automated Playwright build script rendering every preset at fixed time $t=1000\text{ms}$ with fixed seed to static 640×360 PNG thumbnails in `apps/library/public/thumbnails/<id>.png`.
  - **Wallpaper Library Site (`apps/library`)**:
    - Modern Next.js 15 App Router application with React 19, TypeScript, and Tailwind CSS.
    - `/` (Gallery): Instant client-side search and tag filtering across presets, responsive grid with lazy-loaded static thumbnails. Strictly adheres to browser resource limits with **0 WebGL contexts allocated on the gallery page** (Lighthouse performance > 90).
    - `/w/[id]` (Detail Page): Single interactive WebGL2 canvas using `@glowframe/core` and `BrowserInput`, preset attribution, color swatches, and client-side downloads (PNG at 1080p/1440p/4K, `.glowframe.json`, and standalone `.zip` HTML pack). Automatically disposes renderer on unmount/navigation.
    - `/about`: Complete setup guide for Windows (Lively Wallpaper) and Linux (X11 desktop atom hint, Wayland layer-shell protocol on wlroots/KDE, and GNOME Wayland limits).
    - Added unit and E2E tests in `apps/library/src/__tests__/` (8 tests) verifying gallery architecture constraints, zero WebGL contexts on grid, and detail player lifecycle.

## [v0.6.0] - M6: Arbitrary Shapes, Center Content, and Presets

### Added

- **M6: Arbitrary Shapes, Center Content, and Presets**:
  - Implemented arbitrary shape rasterization pipeline in `packages/core/src/shape/rasterize.ts`:
    - `preset`: `triangle`, `circle`, `rounded-rect`, `star`, `hexagon`, `polygon`.
    - `svg-path`: Raw SVG path string `d` with `viewBox` scaling, translation, and padding.
    - `svg-file`: SVG markup parsing, extracting `viewBox` and combining path elements.
    - `text`: Text silhouette rasterization with configurable font family and weight.
  - Implemented asynchronous Web Worker Felzenszwalb EDT computation in `packages/core/src/shape/worker.ts` with zero-copy `ArrayBuffer` transferables, ensuring the main UI thread never blocks during shape distance field generation.
  - Implemented Center Content Layer (`packages/core/src/content/rasterize.ts`):
    - Supports `image`, `svg`, and `text` content inside the shape interior.
    - Strict silhouette mask clipping in fragment shader: content is displayed only when $d < 0$, blending with `u_fillColor` via opacity and optional tint.
    - Dynamic visibility toggling via the `toggle-content` action.
  - Graceful error handling: bad or empty SVGs fail cleanly with typed `AssetLoadError` without crashing or producing a blank screen.
  - Created `@glowframe/presets` package (`packages/presets/`):
    - `triangle-prism`: Reference equilateral triangle.
    - `tux-prism`: Linux mascot Tux silhouette with glowing prismatic edge lighting.
    - `four-pane`: Generic four-pane window silhouette with prismatic division lines.
  - Golden frame screenshots generated and verified: `golden-tux.png`, `golden-four-pane.png`.
  - Added unit test suite in `packages/core/src/__tests__/shape.test.ts` (12 tests) and `@glowframe/presets` (4 tests).
  - Added headless WebGL2 Playwright e2e test suite in `packages/core/src/__tests__/shapes.e2e.test.ts` (5 tests) verifying Tux rendering, click hit-testing inside silhouette, four-pane dividing cross, center content toggling, and graceful recovery from corrupt SVGs.

## [v0.5.0] - M5: Modes and Effects Catalog

### Added

- **M5: Modes and Effects Catalog**:
  - Implemented effect registry system (`packages/core/src/effects/`): each effect explicitly declares its unique `id`, Zod `paramSchema`, and GPU `uniforms`.
  - Implemented all 7 base modes from Section 4:
    - `glow`: Reference static rim prism glow from the Vercel hero.
    - `pulse`: Sine-modulated breathing glow with configurable `speed` and `depth`.
    - `rotate`: Continuous perimeter spectrum rotation at configurable `speed`.
    - `spectrum-cycle`: Full-palette OKLCH hue shift cycling over time.
    - `flicker`: Deterministic seeded neon flicker jitter using multi-frequency harmonic synthesis.
    - `sweep`: Scanning highlight beam travelling along the perimeter at configurable `speed`, `width`, and `intensity`.
    - `orbit`: Virtual light orbiting the shape along a circular trajectory.
  - Implemented all 7 click actions from Section 4:
    - `next-palette`: Cycles to the next palette in `palettes[]` with smooth OKLab spring transitions.
    - `random-palette`: Generates harmonious randomized palettes in OKLCH.
    - `ripple`: Radial wave travelling outwards along the rim from the exact click coordinate with decaying intensity.
    - `burst`: Instant glow intensity flash decaying exponentially ($B(t) = I \times \exp(-\lambda t)$).
    - `next-mode`: Runtime base mode cycling through all modes.
    - `toggle-content`: Toggles center content visibility flag.
    - `none`: Explicit no-op handler.
  - Zero per-frame allocations in render loop across all modes, using pre-allocated typed arrays for uniform uploads.
  - Added unit test suite in `packages/core/src/__tests__/modes.test.ts` (15 tests) verifying param schema validation, mode mathematical evaluations, and runtime mode/action state transitions.
  - Added headless WebGL2 Playwright e2e test suite in `packages/core/src/__tests__/modes.e2e.test.ts` (10 tests):
    - Golden frame screenshots generated and verified at fixed time ($t=1000\text{ms}$) and seed for every base mode (`golden-mode-*.png`).
    - 500 runtime mode switches stress-tested with zero WebGL errors (`NO_ERROR`) and zero memory leaks.
    - WebGL validation of `pulse` breathing peak vs trough, `burst` flash and decay, and pure black interior preservation ($d < 0$).

## [v0.4.0] - M4: Click Hit-Testing and Spring-Animated OKLab Palettes

### Added

- **M4: Click Hit-Testing & Palette Physics**:
  - Implemented CPU distance field hit-testing: evaluates coordinate in shape UV space against the exact Euclidean distance array. Dispatches `objectClick` when $d < 0$ and `backgroundClick` when $d \ge 0$.
  - Implemented critically damped spring animation ($\zeta = 1.0$) in **OKLab** color space for all color stop transitions, avoiding muddy intermediate colors and eliminating overshoot.
  - Implemented `next-palette` (cycles through scene palettes) and `random-palette` (generates harmonious OKLCH palettes with consistent brightness and rich chroma).
  - Rapid click momentum blending: new targets are set without restarting or queuing unbounded work, maintaining smooth continuous motion.
  - Zero per-frame allocations in render loop during spring transitions.
  - Added unit test suites covering:
    - OKLab spring convergence, critically damped behavior, and velocity preservation (`spring.test.ts`).
    - CPU distance hit-testing inside, outside, and at the shape boundary $d=0$ (`hit-test.test.ts`).
  - Added Playwright e2e tests (`click.e2e.test.ts`) verifying:
    - Accurate differentiation between object and background clicks.
    - Advancing palettes on shape clicks and ignoring background clicks.
    - Rapid 10-click stress test without glitching or frame drops.

## [v0.3.0] - M3: Cursor Light, Smoothing, and Idle Orbit

### Added

- **M3: Interactive Cursor Light**:
  - Implemented pointer tracking with configurable smoothing factor (`scene.interaction.smoothing`).
  - Implemented automatic idle detection: after 3 seconds of inactivity (`idleTimeoutMs`), the cursor light smoothly eases into an automatic circular orbit around the shape centroid.
  - Implemented instant recovery from idle mode as soon as pointer input resumes.
  - Directional specular edge illumination where normals facing the cursor catch bright prism reflections.
  - Added unit test suite in `packages/core/src/__tests__/input.test.ts` verifying `BrowserInput` coordinate normalization and cleanup.
  - Added e2e test suite in `packages/core/src/__tests__/cursor.e2e.test.ts` driving a fake `InputSource` with injectable `ManualClock` asserting smoothed transitions, idle orbit initiation at 3s, uniform values (`u_cursorPos`, `u_hasCursor`), and directional rim brightness differential.

## [v0.2.0] - M2: Core v0 - Triangle with Static WebGL2 Glow

### Added

- **M2: Core Renderer Engine (`@glowframe/core`)**:
  - Implemented platform-agnostic `createRenderer` API receiving canvas, scene, input source, and clock.
  - Implemented exact $O(N)$ Felzenszwalb Euclidean Distance Transform (EDT) pipeline: rasterizer → signed distance field (SDF) → normalized R8 texture with linear filtering.
  - Implemented WebGL2 shader pipeline featuring:
    - Central-difference surface normal estimation from SDF texture.
    - Pure black interior clipping.
    - Exponential glow (`exp(-max(d, 0) / falloff)`) plus crisp core line.
    - Prism dispersion mapping angle around shape centroid through OKLCH color palettes.
    - Volumetric cursor directional light with specular sharpness and distance attenuation.
    - Dithering on outside glow in sRGB space to eliminate gradient banding while maintaining true pure black interior.
    - Gamma 2.2 correction and linear color pipeline.
  - High-performance color subsystem converting OKLCH, OKLab, and Linear sRGB with zero per-frame allocations.
  - Interactive test page at `packages/core/test-page/index.html`.
  - Comprehensive test suite covering:
    - Color conversions and smooth OKLab interpolation.
    - Exact EDT distances and CPU hit-testing.
    - Automated headless WebGL2 browser tests via Playwright (100 create/dispose cycles without leaks, `WEBGL_lose_context` simulation and restoration, and golden screenshot validation).

## [v0.1.0] - M0: Monorepo Setup & M1: Scene Schema Specification

### Added

- **M0: Repository Setup**:
  - Configured pnpm workspace (`packages/*`, `apps/*`, `tooling/*`) with Turborepo orchestration.
  - Pinned exact dependency versions for all tools: TypeScript 5.8.2, Turborepo 2.11.10, Vitest 5.1.0, Playwright 1.65.0, ESLint 10.14.0, Prettier 3.9.10, and Dependency Cruiser 18.7.2.
  - Configured strict TypeScript compiler configuration (`tsconfig.base.json`) with `strict: true`, `noImplicitAny: true`, and all defensive flags enabled.
  - Setup `.dependency-cruiser.cjs` to enforce architectural constraints: `schema <- core <- export <- apps/*` and `schema <- presets <- apps/*`, prohibiting cross-layer violations.
  - Setup GitHub Actions CI pipeline covering formatting, linting, dependency rules, typechecking, building, and testing.
- **M1: `@glowframe/schema`**:
  - Implemented `.glowframe.json` scene specification version 1 in Zod with strict numeric bounds and documentation metadata for auto-generating future UI controls.
  - Implemented discriminated union for shapes (`preset`, `svg-path`, `svg-file`, `text`) and center content (`image`, `svg`, `text`).
  - Implemented typed domain errors `SceneValidationError` and `UnsupportedVersionError`.
  - Implemented `parseScene`, `safeParseScene`, `migrate` (upgrades unversioned scenes to v1), and `exportJsonSchema`.
  - Added reference `exampleScene` (prism triangle on dark canvas with OKLCH palettes).
  - Added full test suite with 9 unit tests verifying schema validation, range checks, version rejection, error formatting, shape variants, and migrations.
