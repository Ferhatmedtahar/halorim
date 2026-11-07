# @glowframe/schema

Scene format definition, Zod validation, migrations, and JSON Schema export for Glowframe wallpaper scenes.

## What it does

- Defines the canonical Glowframe scene schema (`.glowframe.json`) using Zod.
- Exports TypeScript types with strict bounds and descriptions for all visual, geometric, color, and interaction parameters.
- Validates scenes at runtime and produces actionable error messages with exact paths.
- Provides version migration (`migrate`) and JSON Schema generation (`exportJsonSchema`).
- Provides the reference `exampleScene`.

## Public API

```ts
import {
  parseScene,
  safeParseScene,
  migrate,
  exportJsonSchema,
  exampleScene,
  SceneSchemaV1,
  SceneValidationError,
  UnsupportedVersionError,
} from '@glowframe/schema';
import type { Scene } from '@glowframe/schema';

// Validate a scene JSON object (throws SceneValidationError on error)
const scene: Scene = parseScene(rawJsonObject);

// Safe parsing without throwing
const result = safeParseScene(rawJsonObject);
if (!result.success) {
  console.error(result.error.message);
}

// Migrate legacy/unversioned scene
const migrated = migrate(legacyScene);

// Generate JSON Schema
const jsonSchema = exportJsonSchema();
```

## Running tests

```bash
pnpm --filter @glowframe/schema test
```
