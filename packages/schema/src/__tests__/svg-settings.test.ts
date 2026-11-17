import { describe, it, expect } from 'vitest';
import { encodeSvgSettings, decodeSvgSettings, type SvgSettings } from '../svg-settings.js';

const sample: SvgSettings = {
  version: 1,
  scale: 0.32,
  edge: { width: 0.0035, falloff: 0.04, intensity: 1.15, dispersion: 0.38 },
  speed: 0.05,
  palette: ['#00dfd8', '#ff0080'],
};

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  ${inner}\n  <path d="M0 0L10 0L5 8Z"/>\n</svg>`;
}

describe('SVG embedded settings', () => {
  it('round-trips through an SVG file', () => {
    expect(decodeSvgSettings(wrap(encodeSvgSettings(sample)))).toEqual(sample);
  });

  it('returns null for plain SVGs', () => {
    expect(decodeSvgSettings(wrap(''))).toBeNull();
  });

  it('ignores other metadata blocks and broken JSON', () => {
    expect(decodeSvgSettings(wrap('<metadata id="other">{"version":1}</metadata>'))).toBeNull();
    expect(decodeSvgSettings(wrap('<metadata id="halorim-settings"><![CDATA[{not json]]></metadata>'))).toBeNull();
  });

  it('rejects out-of-range values instead of applying them', () => {
    const bad = '<metadata id="halorim-settings"><![CDATA[{"version":1,"scale":50}]]></metadata>';
    expect(decodeSvgSettings(wrap(bad))).toBeNull();
  });

  it('accepts partial settings', () => {
    const partial = encodeSvgSettings({ version: 1, palette: ['#ffffff'] });
    expect(decodeSvgSettings(wrap(partial))).toEqual({ version: 1, palette: ['#ffffff'] });
  });
});
