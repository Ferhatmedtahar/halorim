# Changelog

All notable changes to the Glowframe monorepo are documented in this file.

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
