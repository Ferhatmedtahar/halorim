import { CURRENT_SCHEMA_VERSION, Scene, SceneSchemaV1 } from './v1.js';
import { SceneValidationError, UnsupportedVersionError } from './errors.js';
import { ZodError } from 'zod';

export function migrate(raw: unknown): Scene {
  if (typeof raw !== 'object' || raw === null) {
    throw new SceneValidationError('Scene must be an object', [
      { path: '', message: 'Expected object, received ' + typeof raw },
    ]);
  }

  const candidate = { ...(raw as Record<string, unknown>) };

  const rawVersion = candidate['schemaVersion'];

  // Handle unversioned or legacy version 0
  if (rawVersion === undefined || rawVersion === null || rawVersion === 0) {
    candidate['schemaVersion'] = CURRENT_SCHEMA_VERSION;
  } else if (typeof rawVersion === 'number') {
    if (rawVersion > CURRENT_SCHEMA_VERSION || rawVersion < 1) {
      throw new UnsupportedVersionError(rawVersion, [CURRENT_SCHEMA_VERSION]);
    }
  } else {
    throw new UnsupportedVersionError(rawVersion, [CURRENT_SCHEMA_VERSION]);
  }

  return parseScene(candidate);
}

export function parseScene(raw: unknown): Scene {
  if (typeof raw !== 'object' || raw === null) {
    throw new SceneValidationError('Scene must be an object', [
      { path: '', message: 'Expected object, received ' + typeof raw },
    ]);
  }

  const rawObj = raw as Record<string, unknown>;
  const version = rawObj['schemaVersion'];

  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(version, [CURRENT_SCHEMA_VERSION]);
  }

  const result = SceneSchemaV1.safeParse(raw);
  if (!result.success) {
    const issues = formatZodIssues(result.error);
    const readable = issues.map((i) => `  - [${i.path || 'root'}]: ${i.message}`).join('\n');
    throw new SceneValidationError(`Invalid scene schema:\n${readable}`, issues);
  }

  return result.data;
}

export function safeParseScene(
  raw: unknown,
):
  | { success: true; data: Scene }
  | { success: false; error: SceneValidationError | UnsupportedVersionError } {
  try {
    const data = parseScene(raw);
    return { success: true, data };
  } catch (err) {
    if (err instanceof SceneValidationError || err instanceof UnsupportedVersionError) {
      return { success: false, error: err };
    }
    return {
      success: false,
      error: new SceneValidationError(err instanceof Error ? err.message : String(err)),
    };
  }
}

function formatZodIssues(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
