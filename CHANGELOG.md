# Changelog

All notable changes to the Glowframe monorepo are documented in this file.

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
