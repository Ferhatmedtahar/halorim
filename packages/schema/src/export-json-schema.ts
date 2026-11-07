import { zodToJsonSchema } from 'zod-to-json-schema';
import { SceneSchemaV1 } from './v1.js';

export function exportJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(SceneSchemaV1, {
    name: 'GlowframeScene',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}
