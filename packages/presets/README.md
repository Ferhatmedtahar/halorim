# @glowframe/presets

Built-in scene presets and reference assets for the Glowframe wallpaper engine.

## Presets Included

- **`triangle-prism`**: Reference equilateral triangle with multi-color dispersion rim glow.
- **`tux-prism`**: Iconic Tux penguin silhouette with glowing prismatic edge lighting.
- **`four-pane`**: Generic four-pane window silhouette with prismatic division lines.

## Public API

```ts
import {
  triangleScene,
  tuxScene,
  fourPaneScene,
  PRESET_SCENES,
  getPreset,
  ALL_PRESET_IDS,
} from '@glowframe/presets';

const scene = getPreset('tux-prism');
```

## Testing & Building

```bash
pnpm build
pnpm test
```
