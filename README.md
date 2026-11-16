# Halorim

[![CI](https://github.com/Ferhatmedtahar/halorim/actions/workflows/ci.yml/badge.svg)](https://github.com/Ferhatmedtahar/halorim/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An open-source, interactive live wallpaper engine. A dark shape (a logo, a triangle, any SVG) sits
on a black background. Its edges emit glowing, prism-colored light that follows your cursor. Click
the shape to change the colors.

Runs as a real desktop wallpaper on Linux (X11 and Wayland, including GNOME) and Windows, and as a
web gallery where you can preview wallpapers and download them as an image or a scene file.

<!-- TODO: add a screenshot or GIF here, for example docs/media/hero.gif -->

## Features

- **Interactive**: the glow tracks the cursor across the whole desktop, per screen.
- **Any shape**: logos, built-in shapes, or your own SVG through the same pipeline
  (shape → mask → distance field → shader).
- **Multi-monitor**: each screen keeps its own color palette.
- **Data-driven**: a wallpaper is a JSON scene, validated by a versioned schema.
- **Light on resources**: FPS cap, resolution scale, auto-pause on battery saver and fullscreen
  apps. See [Performance](#performance).
- **Web gallery and studio**: browse presets, upload an SVG, pick colors, export.

## Platform support

| Platform                     | Status                                                        |
| :--------------------------- | :------------------------------------------------------------ |
| Linux, X11                   | Supported                                                     |
| Linux, Wayland (wlroots/KDE) | Supported via layer-shell                                     |
| Linux, GNOME on Wayland      | Supported through a bundled GNOME Shell extension (see below) |
| Windows 10 / 11              | Supported, less tested                                        |
| macOS                        | Not yet                                                       |

GNOME Wayland does not allow normal apps to draw behind the desktop. Halorim installs a small Shell
extension that clones its window into the real background. After a Shell update on Wayland you may
need to log out and back in. Details in [docs/LINUX.md](docs/LINUX.md).

## Performance

Measured on a 12-thread CPU with an RTX 4060, two 1080p screens, 60 fps cap, **debug build**:

| Metric                   | Approx. value         |
| :----------------------- | :-------------------- |
| CPU (whole process tree) | ~2 cores busy (211 %) |
| Memory (PSS, total)      | ~680 MB               |

These are worst-case numbers from a development build, not a promise. Release-build numbers and
the lower-FPS / lower-resolution settings are still to be measured. Reproduce on your machine with
`pnpm bench`; method and caveats are in [docs/benchmarks](docs/benchmarks/README.md).

Tray menu options to reduce cost: 15 / 30 / 60 FPS and 0.5x / 0.75x / 1.0x resolution scale.

## Getting started

Requirements: Node 22, pnpm 10, and for the desktop app a Rust toolchain plus Tauri's Linux
dependencies (`webkit2gtk-4.1`, GTK 3).

```bash
git clone https://github.com/Ferhatmedtahar/halorim.git
cd halorim
pnpm install

# web gallery and studio
pnpm --filter @glowframe/library dev      # http://localhost:3000

# desktop wallpaper
pnpm --filter @glowframe/desktop tauri dev
```

## Project layout

```
apps/
  library/    Next.js site: gallery, preview, studio, download
  desktop/    Tauri app that runs a scene as a real wallpaper
packages/
  schema/     Scene format: zod schemas, JSON Schema, versioning, migrations
  core/       WebGL2 renderer engine, platform-agnostic
  presets/    Built-in scenes and logos
  export/     PNG still, scene file, standalone HTML pack
tooling/
  thumbnails/ Pre-renders preset thumbnails
  bench/      CPU and memory measurement for the desktop app
```

Dependency direction is enforced in CI with dependency-cruiser: `schema ← core ← export ← apps`.
`core` never touches the platform, the DOM window, or Node APIs.

## Development

```bash
pnpm build          # build everything (turbo)
pnpm test           # unit tests in every package
pnpm typecheck
pnpm lint           # eslint + dependency rules
pnpm format:check
```

The renderer is also covered by golden-image tests (`packages/core/test-page`), which render
deterministic frames and compare them against committed PNGs.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first and follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately, see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
