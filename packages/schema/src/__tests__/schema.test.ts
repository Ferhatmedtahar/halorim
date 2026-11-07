import { describe, it, expect } from 'vitest';
import {
  parseScene,
  safeParseScene,
  migrate,
  exportJsonSchema,
  exampleScene,
  SceneValidationError,
  UnsupportedVersionError,
} from '../index.js';

describe('@glowframe/schema', () => {
  it('parses valid example scene successfully', () => {
    const scene = parseScene(exampleScene);
    expect(scene.schemaVersion).toBe(1);
    expect(scene.meta.id).toBe('triangle-prism');
    expect(scene.shape.type).toBe('preset');
    if (scene.shape.type === 'preset') {
      expect(scene.shape.preset).toBe('triangle');
    }
  });

  it('rejects scenes with invalid property values with readable errors', () => {
    const invalidScene = {
      ...exampleScene,
      shape: {
        type: 'preset',
        preset: 'triangle',
        scale: 99.0, // max is 2.0
      },
    };

    expect(() => parseScene(invalidScene)).toThrow(SceneValidationError);

    try {
      parseScene(invalidScene);
    } catch (err) {
      expect(err).toBeInstanceOf(SceneValidationError);
      const validationErr = err as SceneValidationError;
      expect(validationErr.issues.some((i) => i.path.includes('scale'))).toBe(true);
      expect(validationErr.message).toContain('scale');
    }
  });

  it('rejects scenes with unknown schemaVersion', () => {
    const futureScene = {
      ...exampleScene,
      schemaVersion: 99,
    };

    expect(() => parseScene(futureScene)).toThrow(UnsupportedVersionError);

    const safeResult = safeParseScene(futureScene);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error).toBeInstanceOf(UnsupportedVersionError);
    }
  });

  it('rejects non-object scene input', () => {
    expect(() => parseScene(null)).toThrow(SceneValidationError);
    expect(() => parseScene('not a scene')).toThrow(SceneValidationError);
  });

  it('migrates unversioned or legacy scenes to v1', () => {
    const { schemaVersion: _, ...unversioned } = exampleScene;
    const migrated = migrate(unversioned);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.meta.id).toBe('triangle-prism');
  });

  it('rejects migration of unsupported future versions', () => {
    const futureScene = {
      ...exampleScene,
      schemaVersion: 2,
    };
    expect(() => migrate(futureScene)).toThrow(UnsupportedVersionError);
  });

  it('exports valid JSON Schema object', () => {
    const jsonSchema = exportJsonSchema();
    expect(jsonSchema).toBeDefined();
    expect(typeof jsonSchema).toBe('object');
    expect(jsonSchema).toHaveProperty('$schema');
  });

  it('validates all shape types: preset, svg-path, svg-file, text', () => {
    // svg-path
    const svgPathScene = {
      ...exampleScene,
      shape: {
        type: 'svg-path',
        d: 'M0 0 L10 10 L0 10 Z',
        viewBox: [0, 0, 10, 10] as [number, number, number, number],
        position: [0.5, 0.5] as [number, number],
        scale: 0.5,
        rotation: 45,
      },
    };
    expect(parseScene(svgPathScene).shape.type).toBe('svg-path');

    // svg-file
    const svgFileScene = {
      ...exampleScene,
      shape: {
        type: 'svg-file',
        asset: 'assets/tux.svg',
        position: [0.5, 0.5] as [number, number],
        scale: 0.5,
        rotation: 0,
      },
    };
    expect(parseScene(svgFileScene).shape.type).toBe('svg-file');

    // text
    const textScene = {
      ...exampleScene,
      shape: {
        type: 'text',
        text: 'GLOW',
        font: 'bold 48px Inter',
        position: [0.5, 0.5] as [number, number],
        scale: 0.4,
        rotation: 0,
      },
    };
    expect(parseScene(textScene).shape.type).toBe('text');
  });

  it('validates palettes and requires at least one palette with 2 stops', () => {
    const emptyPalettes = {
      ...exampleScene,
      palettes: [],
    };
    expect(() => parseScene(emptyPalettes)).toThrow(SceneValidationError);

    const singleStopPalette = {
      ...exampleScene,
      palettes: [['#ff0000']],
    };
    expect(() => parseScene(singleStopPalette)).toThrow(SceneValidationError);
  });
});
