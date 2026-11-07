export {
  CURRENT_SCHEMA_VERSION,
  MetaSchema,
  BackgroundSchema,
  PresetShapeTypeSchema,
  PresetShapeSchema,
  SvgPathShapeSchema,
  SvgFileShapeSchema,
  TextShapeSchema,
  ShapeSchema,
  CenterContentSchema,
  FillSchema,
  EdgeSchema,
  PaletteSchema,
  PalettesSchema,
  BaseModeIdSchema,
  ModeSchema,
  ModifierSchema,
  InteractionSchema,
  ClickActionIdSchema,
  ClickActionItemSchema,
  OnClickSchema,
  PerformanceSchema,
  SceneSchemaV1,
} from './v1.js';

export type {
  PresetShapeType,
  PresetShape,
  SvgPathShape,
  SvgFileShape,
  TextShape,
  Shape,
  CenterContent,
  BaseModeId,
  ClickActionId,
  ClickActionItem,
  Scene,
  SceneV1,
} from './v1.js';

export { SceneValidationError, UnsupportedVersionError } from './errors.js';
export { migrate, parseScene, safeParseScene } from './migrate.js';
export { exportJsonSchema } from './export-json-schema.js';
export { exampleScene } from './example.js';
