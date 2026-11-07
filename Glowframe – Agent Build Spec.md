# Glowframe – Agent Build Spec

Working name: **Glowframe**. An open-source, interactive desktop wallpaper engine. A dark shape (triangle, Linux logo, Windows logo, any SVG) sits on a black background. Its edges emit glowing, prism-colored light. The light follows the cursor. Clicking the shape changes the edge colors and triggers effects. A separate Next.js website hosts a library of wallpapers that people can preview and download as an image or as a wallpaper file.

Read this whole document before writing any code. Follow the milestones in order.

---

## 1. Rules for the agent (non-negotiable)

1. **One milestone at a time.** Do not start milestone N+1 until every acceptance criterion of milestone N passes and the work is committed.
2. **Core is platform-agnostic.** `packages/core` must never import anything about Windows, Linux, Tauri, Next.js, Node file APIs or the global `window`. It receives a canvas, a scene, and an input source. Nothing else.
3. **One code path per concept.** Every shape (triangle, logo, text, user SVG) goes through the same pipeline: shape → mask → distance field → shader. No special-case shaders for the triangle.
4. **Do not add features outside this spec.** If something is ambiguous or missing, stop and ask instead of guessing.
5. **Everything is data-driven.** A wallpaper is a JSON scene plus optional assets. No wallpaper-specific code anywhere in core.
6. **Tests are part of every milestone.** No milestone is done without the tests listed for it.
7. **No per-frame allocations** in the render loop (no new arrays, objects or closures inside `requestAnimationFrame`).
8. **Pin dependency versions** and commit the lockfile.
9. **Write a short `README.md` in every package** explaining what it does, its public API, and how to run its tests.
10. Use TypeScript in strict mode everywhere. No `any` in public APIs.

---

## 2. Architecture and repo layout

Monorepo with pnpm workspaces and Turborepo.

```
glowframe/
  packages/
    schema/      Scene format: zod schemas, JSON Schema export, versioning, migrations
    core/        The renderer engine (WebGL2), effects, input handling, no platform code
    presets/     Built-in scenes + their SVG/image assets (JSON files, no code)
    export/      Export helpers: PNG still, scene file, standalone HTML pack (zip)
  apps/
    library/     Next.js website: gallery, preview, download
    studio/      (later) Next.js builder/editor, same renderer
    desktop/     (later) Tauri app that runs a scene as a real wallpaper
  tooling/
    thumbnails/  Script that pre-renders PNG thumbnails of every preset
```

Dependency direction (strict, enforce with an ESLint import rule or dependency-cruiser):

```
schema  <-  core  <-  export  <-  apps/*
schema  <-  presets <- apps/*
```

`core` may import `schema`. `schema` imports nothing. Apps import core, never the reverse.

---

## 3. Core engine design

### 3.1 Public API

```ts
const renderer = createRenderer({
  canvas, // HTMLCanvasElement or OffscreenCanvas
  scene, // validated Scene object
  input, // InputSource (see 3.5)
  clock, // optional injectable clock, used by tests for determinism
});

renderer.start();
renderer.stop();
renderer.setScene(scene); // hot swap, must not leak GPU resources
renderer.setPaused(true); // for hosts that need it
renderer.setResolutionScale(0.5); // 0.25 to 1
renderer.setFpsCap(30);
renderer.resize(width, height, devicePixelRatio);
renderer.renderFrame(timeMs); // single deterministic frame, used for PNG export and tests
renderer.dispose(); // frees every GPU resource
```

### 3.2 Shape pipeline (the key to zero shape-specific bugs)

Every shape becomes a **signed distance field (SDF) texture**:

1. **Rasterize** the shape into an offscreen 2D canvas, 1024×1024 max, white shape on black.
   - `preset` shapes (triangle, polygon, circle, rounded-rect) are generated as `Path2D`.
   - `svg-path` shapes use the SVG path data as `Path2D`.
   - `svg-file` shapes parse an SVG, flatten it to one combined path (ignore its colors).
   - `text` shapes draw text with a given font.
2. **Compute the exact Euclidean distance transform** (Felzenszwalb algorithm) for the inside and outside, combine into a signed distance. Run it once per shape load, in a Web Worker so the UI never blocks.
3. **Normalize** the distance by a `maxDistance` (in pixels of the 1024 grid) and upload it as an **R8 texture with linear filtering**. Do not use float textures. They need extensions that are not available everywhere.
4. **Keep the CPU copy** of the distance array. It is used for click hit-testing, so hit-test and visuals can never disagree.
5. The shape is placed in the scene with `position`, `scale`, `rotation`. The shader maps screen UV into shape UV.

### 3.3 Fragment shader responsibilities

For each pixel:

1. Sample distance `d` (negative inside the shape).
2. Compute the surface normal from the SDF gradient (central differences on the texture).
3. **Inside** the shape: solid fill (default pure black) or the optional center content (image/text), clipped by the mask.
4. **Outside / on the rim**: glow = `exp(-max(d,0) / falloff)` plus a thin bright line at `d ≈ 0`.
5. **Edge color**: angle around the shape center (plus `rotation` animation) mapped through the palette. This is what gives the prism look.
6. **Cursor light**: brightness boost on edges whose normal faces the cursor: `pow(max(dot(normal, dirToCursor), 0), sharpness)`, attenuated by distance to the cursor. Plus a soft volumetric haze that fades with distance from the cursor and is darkened by the shape (cheap occlusion: 4–6 SDF samples along the ray).
7. Output premultiplied alpha, in **linear color space**, with a final tone map and gamma step. Add a tiny dither noise to remove banding in dark gradients.

Glow should be rendered at the chosen resolution scale. If `resolutionScale < 1`, upscale with a smooth filter. Edges stay clean because the glow is soft anyway.

### 3.4 Colors

- Palettes are arrays of color stops stored in **OKLCH**.
- Transitions interpolate in **OKLab**, never in raw RGB, so colors do not turn muddy gray mid-transition.
- Palette changes (on click) are animated with a **critically damped spring** on the CPU (no overshoot, no flicker). Uniforms are updated once per frame.

### 3.5 Input abstraction (this is what makes it cross-platform)

```ts
interface InputSource {
  // normalized coordinates, 0..1 over the canvas, origin top-left
  subscribe(handlers: {
    onPointerMove(x: number, y: number): void;
    onPointerDown(x: number, y: number): void;
    onPointerLeave(): void;
    onVisibilityChange(visible: boolean): void;
  }): () => void; // returns unsubscribe
}
```

The core ships one implementation, `BrowserInput` (pointer events, including touch). Hosts provide their own later:

- `HostInput` for the Tauri desktop app: global cursor position sent over IPC.
- `LivelyInput` for Lively Wallpaper on Windows (its mouse/property listener).

Core code must work with any implementation. Never read `window.event` or `document` inside the render or effect code.

### 3.6 Click and hit-testing

- On `onPointerDown`, convert the position to shape UV and read the CPU distance array.
- `d < 0` → fire `objectClick`. Otherwise → fire `backgroundClick`.
- Each scene maps these two events to a list of actions (see 5).
- A click while an action is animating must not queue unbounded work. Actions replace or blend with the running one.

### 3.7 Lifecycle, performance, robustness

- Default **30 fps cap**, resolution scale 0.5 for wallpaper use. Browser preview defaults to 60 fps and scale 1.
- Pause rendering when the canvas is hidden (`onVisibilityChange(false)`) and resume cleanly.
- Handle **WebGL context loss and restore**: on `webglcontextlost` stop the loop; on `webglcontextrestored` rebuild every texture and program. Test this.
- Handle resize and devicePixelRatio changes without recreating the renderer.
- If WebGL2 is unavailable, throw a typed `UnsupportedError`. Apps show a friendly fallback (static PNG).
- After idle (no pointer movement for 3 s) the light eases to an automatic slow orbit around the shape so the wallpaper never looks dead.
- `dispose()` must delete every texture, buffer, program and listener. Verify with a test that creates and disposes 100 renderers.

---

## 4. Modes and effects catalog

A scene has one **base mode** (continuous animation) and any number of **modifiers**. Cursor-following light is always available and is controlled by `interaction.followCursor`.

### Base modes

| id               | Behavior                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| `glow`           | Static rim glow. The reference look from the Vercel hero.                         |
| `pulse`          | Glow intensity breathes (sine), speed and depth configurable.                     |
| `rotate`         | The color wheel rotates around the shape, speed configurable (animated spectrum). |
| `spectrum-cycle` | The whole palette hue-shifts slowly over time.                                    |
| `flicker`        | Neon flicker: random but seeded, subtle intensity jitter.                         |
| `sweep`          | A bright highlight travels around the outline like a scanning beam.               |
| `orbit`          | A virtual light orbits the shape (used as idle behavior too).                     |

### Click actions (assignable to `objectClick` and `backgroundClick`)

| id               | Behavior                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `next-palette`   | Spring-transition to the next palette in `palettes[]`.                                     |
| `random-palette` | Generate a pleasant random palette (random base hue, harmonious offsets in OKLCH). Seeded. |
| `ripple`         | A bright ring travels along the rim outward from the click point.                          |
| `burst`          | Quick flash of glow intensity that decays.                                                 |
| `next-mode`      | Cycle through a list of base modes (`glow` → `pulse` → `rotate`...).                       |
| `toggle-content` | Show or hide the center content.                                                           |
| `none`           | Do nothing.                                                                                |

Default for the reference preset: `objectClick: [next-palette, ripple]`, `backgroundClick: [none]`.

---

## 5. Scene format v1 (`@glowframe/schema`)

File extension: `.glowframe.json`. Always include `schemaVersion`. Validate with zod on load; reject unknown versions with a clear error, and provide `migrate(scene)` for older versions.

```json
{
  "schemaVersion": 1,
  "meta": {
    "id": "triangle-prism",
    "name": "Prism Triangle",
    "author": "Your Name",
    "license": "CC0-1.0",
    "tags": ["minimal", "dark", "triangle"]
  },
  "background": { "color": "#000000", "haze": { "intensity": 0.6 } },
  "shape": {
    "type": "preset",
    "preset": "triangle",
    "position": [0.5, 0.52],
    "scale": 0.28,
    "rotation": 0
  },
  "fill": { "color": "#000000", "content": null },
  "edge": {
    "width": 0.004,
    "falloff": 0.09,
    "intensity": 1.0,
    "dispersion": 0.35
  },
  "palettes": [
    ["oklch(0.75 0.2 350)", "oklch(0.7 0.2 290)", "oklch(0.7 0.18 250)", "oklch(0.8 0.2 150)"],
    ["oklch(0.8 0.18 80)", "oklch(0.7 0.22 40)", "oklch(0.65 0.25 20)"]
  ],
  "mode": { "id": "glow", "params": {} },
  "modifiers": [],
  "interaction": {
    "followCursor": true,
    "sharpness": 3.0,
    "smoothing": 0.12,
    "idleOrbit": true
  },
  "onClick": {
    "object": [{ "action": "next-palette" }, { "action": "ripple" }],
    "background": []
  },
  "performance": { "fpsCap": 30, "resolutionScale": 0.5 }
}
```

Shape types: `preset` (triangle, hexagon, circle, rounded-rect, star), `svg-path` (a `d` string plus viewBox), `svg-file` (asset reference), `text` (string plus font). Center content: `{ "type": "image" | "text" | "svg", "asset": "...", "tint": "#ffffff" | null, "scale": 0.6 }`.

All numeric params need min/max ranges defined in the schema so the future builder can generate sliders automatically.

---

## 6. Library website (`apps/library`)

A **separate** Next.js (App Router, TypeScript, Tailwind) site. It only consumes `presets`, `core` and `export`. It contains no rendering logic of its own.

### Pages

- `/` Gallery grid with search and tag filters.
- `/w/[id]` Detail page with a live preview and download options.
- `/about` How to install and run the wallpaper on Windows and Linux.

### Critical bug-avoidance rule for the gallery

Browsers allow only about 16 WebGL contexts at once. **Do not render a live WebGL canvas per gallery card.**

- Gallery cards show **pre-rendered PNG thumbnails**, generated at build time by `tooling/thumbnails` (headless Playwright running `renderer.renderFrame` at a fixed time with a fixed seed).
- Only the **detail page** creates a live renderer (one canvas). Optional: a hover preview using one shared renderer instance that is moved between cards, never more than one at a time.
- Dispose the renderer on route change.

### Downloads (all client-side, no backend in v1)

On the detail page, the user chooses:

1. **Image (PNG)** at a selected resolution (1920×1080, 2560×1440, 3840×2160, or custom). Rendered in the browser with `renderFrame` on an `OffscreenCanvas` (or a hidden canvas), then `toBlob`. Render and read back in the same task to avoid blank images.
2. **Wallpaper file** (`.glowframe.json`) for the desktop app.
3. **Standalone HTML pack** (`.zip`) containing `index.html`, the bundled core, `scene.json` and assets. It runs in Lively Wallpaper or any browser/webview wallpaper host. Build the zip in the browser with `fflate`.

Data source in v1: JSON files from `packages/presets`, statically generated. A database (Supabase) and community uploads are a later phase, not v1. Do not build them now.

Licensing: each preset has a `license` and `author` shown on its page. Code is MIT.

Logo note: the **Tux** penguin (Larry Ewing) is allowed with attribution. The **Windows logo is a Microsoft trademark**: do not bundle the official logo. Ship a simple generic four-pane preset instead, and let users bring their own SVG in the future studio.

---

## 7. Desktop runner (later, do not start before milestone 7)

A Tauri app that loads the core in a webview behind all windows and feeds it global cursor positions via `HostInput`.

- **Windows:** parent the window to the `WorkerW` window behind the desktop icons. Poll the global cursor and forward it (rate limited to about 60 Hz).
- **Linux:** X11 via a desktop-type window hint. Wayland on wlroots compositors and KDE via the layer-shell protocol. GNOME on Wayland does not support layer-shell, so document it as unsupported at first and plan an X11/XWayland fallback.
- Must pause when a fullscreen app covers it and when on battery saver, using `setPaused`.
- A tray menu to choose the scene, change fps and resolution scale, and quit.

The core already supports all of this through `InputSource`, `setPaused`, `setFpsCap` and `setResolutionScale`. Do not modify core for platform reasons. Fix it in the host instead.

---

## 8. Milestones and acceptance criteria

**M0: Repo setup.** pnpm + Turborepo, strict TS, ESLint, Prettier, Vitest, Playwright, CI (GitHub Actions: lint, typecheck, test, build). Dependency rule enforced. _Done when:_ `pnpm build && pnpm test` pass on a clean clone and CI is green.

**M1: Schema.** Implement `@glowframe/schema` with zod, JSON Schema export, `migrate`, and the example scene. _Done when:_ valid scenes parse, invalid ones fail with readable errors, unknown `schemaVersion` is rejected. Unit tests cover each.

**M2: Core v0, triangle with static glow.** Renderer with the shape pipeline (preset triangle only), SDF texture, rim glow, palette via angle, 30 fps cap, resize, dispose. A minimal HTML test page. _Done when:_ the triangle on black looks like the reference (soft multicolor rim glow, black interior). Golden screenshot test passes. 100 create/dispose cycles do not grow GPU memory or listeners.

**M3: Cursor light.** `BrowserInput`, light follows the pointer with smoothing, idle orbit. _Done when:_ rim brightens on the side facing the cursor, moves smoothly, returns to idle orbit after 3 s. Tests drive a fake `InputSource` and assert uniform values.

**M4: Click, hit-testing, palettes.** CPU hit-test, `next-palette`, `random-palette`, spring transitions in OKLab. _Done when:_ clicking inside the shape changes colors smoothly, clicking outside does nothing, rapid clicking never glitches or stacks. Unit tests cover hit-testing at edges (d = 0) and palette interpolation.

**M5: Modes and effects.** All base modes and click actions from section 4, as an effect registry (each effect declares id, param schema, uniforms). _Done when:_ each mode has a golden screenshot at a fixed time and seed, and switching modes at runtime does not leak resources.

**M6: Arbitrary shapes and center content.** `svg-path`, `svg-file`, `text` shapes, Web Worker EDT, center content layer. Add the Tux preset and a generic four-pane preset. _Done when:_ Tux renders with the same look as the triangle, clicks work only inside the silhouette, and bad SVGs fail gracefully with an error, never a blank screen.

**M7: Export and library site.** `packages/export` (PNG, scene file, HTML pack), `tooling/thumbnails`, `apps/library` with gallery, detail page and downloads. At least 6 presets. _Done when:_ every download type works, the PNG is not blank at 4K, the HTML pack runs offline when unzipped, and Lighthouse performance on the gallery is above 90.

**M8: Windows desktop runner (Tauri).** _Done when:_ the scene runs behind icons, follows the global cursor, clicking the desktop shape triggers actions, CPU/GPU usage stays low and it pauses under a fullscreen app.

**M9: Linux runner.** X11 first, then layer-shell. Document GNOME limits.

**Later (not now):** the `studio` builder app, community uploads, accounts, a database, macOS.

---

## 9. Bug-prevention checklist (verify before closing each milestone)

- Canvas size is `cssSize × devicePixelRatio × resolutionScale`, and pointer coordinates are normalized against the CSS size.
- Color is handled in linear space. Alpha is premultiplied consistently.
- No NaN in the shader: guard `normalize(0)`, `atan2(0,0)` and divisions.
- Time is a uniform from the injectable clock, never `Date.now()` inside effects. Random effects use a seeded PRNG.
- Loop uses a single `requestAnimationFrame` chain that is cancelled on stop and dispose. No double loops after `setScene`.
- Context loss and restore are tested manually and with `WEBGL_lose_context` in an automated test.
- Every public function validates its input and throws typed errors (`SceneValidationError`, `UnsupportedError`, `AssetLoadError`).
- Large assets are size-limited (reject images above 4096 px or 8 MB).
- Golden-image tests use a fixed viewport, fixed time and fixed seed, with a small pixel-difference tolerance for GPU differences.
- Every milestone ends with a short `CHANGELOG.md` entry and a tagged commit.

---

## 10. Out of scope for now

Accounts, payments, community uploads, moderation, node-graph shader editor, video export, macOS and mobile, WebGPU. Do not build these. If you think one is needed, stop and ask.

---

## 11. First instruction to the agent

"Start with M0 and M1 only. When both pass their acceptance criteria, stop and report what you built, the test results, and any open questions before starting M2."
