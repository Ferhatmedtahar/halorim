import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const MetaSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(
        /^[a-z0-9-_]+$/,
        'ID must consist of lowercase alphanumeric, hyphens, and underscores',
      ),
    name: z.string().min(1),
    author: z.string().min(1),
    license: z.string().min(1),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    previewImage: z.string().optional(),
  })
  .describe('Scene metadata and licensing');

export const BackgroundSchema = z
  .object({
    color: z
      .string()
      .min(1)
      .default('#000000')
      .describe('Background color in hex, rgb, or oklch format'),
    haze: z
      .object({
        intensity: z.number().min(0.0).max(2.0).default(0.6).describe('Volumetric haze intensity'),
        color: z.string().optional().describe('Optional haze tint color'),
      })
      .default({ intensity: 0.6 }),
  })
  .describe('Background styling and haze effect');

const BaseShapeProps = {
  position: z
    .tuple([
      z.number().min(0.0).max(1.0).describe('Normalized center X coordinate'),
      z.number().min(0.0).max(1.0).describe('Normalized center Y coordinate'),
    ])
    .default([0.5, 0.5]),
  scale: z
    .number()
    .min(0.01)
    .max(2.0)
    .default(0.3)
    .describe('Shape scale relative to canvas short dimension'),
  rotation: z.number().min(-360.0).max(360.0).default(0.0).describe('Rotation in degrees'),
};

export const PresetShapeTypeSchema = z.enum([
  'triangle',
  'hexagon',
  'circle',
  'rounded-rect',
  'star',
  'polygon',
]);

export const PresetShapeSchema = z
  .object({
    type: z.literal('preset'),
    preset: PresetShapeTypeSchema,
    sides: z.number().int().min(3).max(32).optional().describe('Number of sides for polygon'),
    cornerRadius: z
      .number()
      .min(0.0)
      .max(0.5)
      .optional()
      .describe('Normalized corner radius for rounded shapes'),
    ...BaseShapeProps,
  })
  .describe('Built-in geometric preset shape');

export const SvgPathShapeSchema = z
  .object({
    type: z.literal('svg-path'),
    d: z.string().min(1).describe('SVG path data string (d attribute)'),
    viewBox: z
      .tuple([
        z.number().describe('viewBox min-x'),
        z.number().describe('viewBox min-y'),
        z.number().positive().describe('viewBox width'),
        z.number().positive().describe('viewBox height'),
      ])
      .describe('SVG viewBox [minX, minY, width, height]'),
    ...BaseShapeProps,
  })
  .describe('Vector shape defined by raw SVG path data');

export const SvgFileShapeSchema = z
  .object({
    type: z.literal('svg-file'),
    asset: z.string().min(1).describe('Relative path or asset identifier for the SVG file'),
    viewBox: z
      .tuple([z.number(), z.number(), z.number().positive(), z.number().positive()])
      .optional()
      .describe('Optional explicit viewBox override'),
    ...BaseShapeProps,
  })
  .describe('Vector shape loaded from an SVG file');

export const TextShapeSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().min(1).describe('Text content to render as shape silhouette'),
    font: z.string().default('sans-serif').describe('Font family or specifier for rendering text'),
    fontWeight: z.string().optional().describe('CSS font weight'),
    ...BaseShapeProps,
  })
  .describe('Silhouette shape generated from text');

export const ShapeSchema = z
  .discriminatedUnion('type', [
    PresetShapeSchema,
    SvgPathShapeSchema,
    SvgFileShapeSchema,
    TextShapeSchema,
  ])
  .describe('The silhouette shape at the center of the scene');

export const CenterContentSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('image'),
      asset: z.string().min(1).describe('Path to image asset'),
      tint: z.string().nullable().optional().describe('Optional color tint overlay'),
      scale: z
        .number()
        .min(0.01)
        .max(2.0)
        .default(0.6)
        .describe('Content scale relative to shape interior'),
      opacity: z.number().min(0.0).max(1.0).default(1.0),
    }),
    z.object({
      type: z.literal('svg'),
      asset: z.string().min(1).describe('Path to SVG asset'),
      tint: z.string().nullable().optional().describe('Optional color tint overlay'),
      scale: z
        .number()
        .min(0.01)
        .max(2.0)
        .default(0.6)
        .describe('Content scale relative to shape interior'),
      opacity: z.number().min(0.0).max(1.0).default(1.0),
    }),
    z.object({
      type: z.literal('text'),
      text: z.string().min(1).describe('Interior text message or symbol'),
      fontFamily: z.string().default('sans-serif'),
      tint: z.string().nullable().optional(),
      scale: z.number().min(0.01).max(2.0).default(0.6),
      opacity: z.number().min(0.0).max(1.0).default(1.0),
    }),
  ])
  .nullable()
  .describe('Optional content inside the shape interior mask');

export const FillSchema = z
  .object({
    color: z.string().min(1).default('#000000').describe('Base interior color, default pure black'),
    content: CenterContentSchema.default(null),
  })
  .describe('Shape interior fill configuration');

export const EdgeSchema = z
  .object({
    width: z
      .number()
      .min(0.0001)
      .max(0.05)
      .default(0.004)
      .describe('Core rim line width in normalized units'),
    falloff: z
      .number()
      .min(0.001)
      .max(0.5)
      .default(0.09)
      .describe('Glow exponential falloff distance'),
    intensity: z
      .number()
      .min(0.0)
      .max(5.0)
      .default(1.0)
      .describe('Overall glow brightness multiplier'),
    dispersion: z
      .number()
      .min(0.0)
      .max(2.0)
      .default(0.35)
      .describe('Prism dispersion spread along the perimeter'),
  })
  .describe('Rim glow and light emission properties');

export const PaletteSchema = z
  .array(z.string().min(1))
  .min(2, 'Each palette must contain at least 2 color stops')
  .describe('A color palette represented as an ordered array of color strings (OKLCH recommended)');

export const PalettesSchema = z
  .array(PaletteSchema)
  .min(1, 'Scene must provide at least one palette')
  .describe('List of available color palettes for cycle/transitions');

export const BaseModeIdSchema = z.enum([
  'glow',
  'pulse',
  'rotate',
  'spectrum-cycle',
  'flicker',
  'sweep',
  'orbit',
]);

export const ModeSchema = z
  .object({
    id: BaseModeIdSchema.or(z.string().min(1)).describe('Base animation mode identifier'),
    params: z
      .record(z.unknown())
      .default({})
      .describe('Mode-specific continuous animation parameters'),
  })
  .describe('Base continuous animation mode');

export const ModifierSchema = z
  .object({
    id: z.string().min(1).describe('Modifier effect identifier'),
    params: z.record(z.unknown()).default({}).describe('Modifier parameters'),
  })
  .describe('Secondary continuous effect modifier');

export const InteractionSchema = z
  .object({
    followCursor: z
      .boolean()
      .default(true)
      .describe('Whether cursor position directs rim lighting'),
    sharpness: z
      .number()
      .min(0.1)
      .max(10.0)
      .default(3.0)
      .describe('Specular highlight focus sharpness'),
    smoothing: z
      .number()
      .min(0.01)
      .max(1.0)
      .default(0.12)
      .describe('Cursor interpolation smoothing factor'),
    idleOrbit: z
      .boolean()
      .default(true)
      .describe('Whether to ease to idle light orbit when inactive'),
    idleTimeoutMs: z
      .number()
      .int()
      .min(500)
      .max(60000)
      .default(3000)
      .describe('Inactivity timeout before idle orbit starts'),
  })
  .describe('Interactive pointer illumination settings');

export const ClickActionIdSchema = z.enum([
  'next-palette',
  'random-palette',
  'ripple',
  'burst',
  'next-mode',
  'toggle-content',
  'none',
]);

export const ClickActionItemSchema = z
  .object({
    action: ClickActionIdSchema.or(z.string().min(1)).describe('Action identifier to trigger'),
    params: z.record(z.unknown()).optional().describe('Optional parameters for the click action'),
  })
  .describe('Click event action entry');

export const OnClickSchema = z
  .object({
    object: z
      .array(ClickActionItemSchema)
      .default([])
      .describe('Actions executed on clicking inside the shape silhouette'),
    background: z
      .array(ClickActionItemSchema)
      .default([])
      .describe('Actions executed on clicking the background'),
  })
  .describe('Click event bindings');

export const PerformanceSchema = z
  .object({
    fpsCap: z.number().int().min(10).max(144).default(60).describe('Target frames per second cap'),
    resolutionScale: z
      .number()
      .min(0.25)
      .max(1.0)
      .default(1.0)
      .describe('Rendering resolution scale relative to canvas physical size'),
  })
  .describe('Rendering performance targets');

export const SceneSchemaV1 = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    meta: MetaSchema,
    background: BackgroundSchema,
    shape: ShapeSchema,
    fill: FillSchema,
    edge: EdgeSchema,
    palettes: PalettesSchema,
    mode: ModeSchema,
    modifiers: z.array(ModifierSchema).default([]),
    interaction: InteractionSchema,
    onClick: OnClickSchema,
    performance: PerformanceSchema,
  })
  .describe('Glowframe Scene v1 Specification');

export type PresetShapeType = z.infer<typeof PresetShapeTypeSchema>;
export type PresetShape = z.infer<typeof PresetShapeSchema>;
export type SvgPathShape = z.infer<typeof SvgPathShapeSchema>;
export type SvgFileShape = z.infer<typeof SvgFileShapeSchema>;
export type TextShape = z.infer<typeof TextShapeSchema>;
export type Shape = z.infer<typeof ShapeSchema>;
export type CenterContent = z.infer<typeof CenterContentSchema>;
export type BaseModeId = z.infer<typeof BaseModeIdSchema>;
export type ClickActionId = z.infer<typeof ClickActionIdSchema>;
export type ClickActionItem = z.infer<typeof ClickActionItemSchema>;
export type Scene = z.infer<typeof SceneSchemaV1>;
export type SceneV1 = Scene;
