# Changelog

All notable changes to the Glowframe monorepo are documented in this file.

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
