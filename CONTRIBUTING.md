# Contributing to Halorim

Thanks for helping. Bug reports, wallpapers, docs and code are all welcome.

## Setup

Requirements: Node 22, pnpm 10 (`corepack enable`), and for the desktop app a Rust toolchain plus
Tauri's Linux dependencies (`webkit2gtk-4.1`, GTK 3).

```bash
git clone https://github.com/Ferhatmedtahar/halorim.git
cd halorim
pnpm install
pnpm --filter @glowframe/library dev      # web gallery, http://localhost:3000
pnpm --filter @glowframe/desktop tauri dev # desktop wallpaper
```

## Before you open a PR

CI runs exactly these, so run them locally first:

```bash
pnpm format:check   # fix with: pnpm format
pnpm lint           # eslint + dependency rules
pnpm typecheck
pnpm build
pnpm test
```

## Architecture rules

- `packages/core` is platform-agnostic: no Tauri, Next.js, Node file APIs, or global `window`.
- Dependency direction is `schema ← core ← export ← apps`. dependency-cruiser enforces it.
- Every shape goes through the same pipeline (shape → mask → distance field → shader). No
  per-shape shaders.
- A wallpaper is data (a JSON scene), never wallpaper-specific code in core.
- No per-frame allocations in the render loop.
- TypeScript strict, no `any` in public APIs. Pin dependency versions and commit the lockfile.

## Pull requests

1. Open an issue first for anything bigger than a small fix, so we agree on the approach.
2. Branch from `main`, keep the PR focused, and add or update tests.
3. Use [Conventional Commits](https://www.conventionalcommits.org) (`feat(core): ...`,
   `fix(desktop): ...`).
4. If rendering output changes on purpose, regenerate the golden images in
   `packages/core/test-page` and say so in the PR.
5. If you change performance-sensitive code, include `pnpm bench` numbers (see
   [docs/benchmarks](docs/benchmarks/README.md)).

## Reporting bugs

Use the bug report template. For desktop issues include your distro, session type (X11 or
Wayland), desktop environment, and the log at `~/.config/glowframe/glowframe.log`. Report security
problems privately, see [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
