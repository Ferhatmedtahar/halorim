import { z } from 'zod';

/**
 * Glow settings embedded in an exported SVG, so one file carries both the shape and how it is lit.
 *
 * Stored as JSON inside `<metadata id="halorim-settings"><![CDATA[ ... ]]></metadata>`. Image viewers
 * and editors ignore metadata, so the file stays a normal SVG. Every field is optional: whatever is
 * missing falls back to the app's defaults, and plain SVGs without the block load as before.
 */
export const SvgSettingsSchema = z
  .object({
    version: z.literal(1),
    scale: z.number().min(0.01).max(2).optional(),
    edge: z
      .object({
        width: z.number().min(0).max(0.1).optional(),
        falloff: z.number().min(0).max(1).optional(),
        intensity: z.number().min(0).max(10).optional(),
        dispersion: z.number().min(0).max(1).optional(),
      })
      .optional(),
    speed: z.number().min(0).max(1).optional(),
    palette: z.array(z.string().min(1)).min(1).max(8).optional(),
  })
  .describe('Halorim glow settings embedded in an SVG');

export type SvgSettings = z.infer<typeof SvgSettingsSchema>;

export const SVG_SETTINGS_ID = 'halorim-settings';

const BLOCK_RE = new RegExp(
  `<metadata[^>]*\\bid=["']${SVG_SETTINGS_ID}["'][^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</metadata>`,
  'i',
);

/** The `<metadata>` element to place inside the root `<svg>` element. */
export function encodeSvgSettings(settings: SvgSettings): string {
  const json = JSON.stringify(SvgSettingsSchema.parse(settings)).replace(/]]>/g, ']]]]><![CDATA[>');
  return `<metadata id="${SVG_SETTINGS_ID}"><![CDATA[${json}]]></metadata>`;
}

/** Reads embedded settings. Returns null when the SVG has none or they are not valid. */
export function decodeSvgSettings(svg: string): SvgSettings | null {
  const match = BLOCK_RE.exec(svg);
  if (!match || match[1] === undefined) return null;
  try {
    const result = SvgSettingsSchema.safeParse(JSON.parse(match[1].trim()));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
