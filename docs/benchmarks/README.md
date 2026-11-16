# Benchmarks

Real cost of running Halorim as a live wallpaper. Numbers are **approximate**: they come from one
machine and will differ on yours. Run the tool yourself and compare.

## Measure your own machine

```bash
# 1. start the app and let it settle for ~10 s
# 2. sample CPU + memory of the whole process tree for 30 s
pnpm bench -- --duration 30 --label my-machine --out docs/benchmarks/raw/my-machine.json
```

What it measures (Linux only, reads `/proc`, no dependencies):

- **CPU**: user + system time of `glowframe-desktop` and every child (WebKit web processes do the
  WebGL rendering, one per screen). `100 %` = one full core.
- **Memory**: PSS (proportional set size). Shared pages are split between processes, so the total
  does not double count shared libraries the way RSS does.
- **Compositor CPU**: `gnome-shell` during the run, for context. It includes everything else on
  screen, so treat it as an upper bound, not as Halorim's cost.

Not measured yet: GPU utilisation and power draw.

## Baseline

| Field   | Value                                                                |
| :------ | :------------------------------------------------------------------- |
| Machine | 12 threads, 30 GB RAM, NVIDIA RTX 4060, Ubuntu 26.04, GNOME Wayland  |
| Screens | 2 x 1920x1080                                                        |
| Scene   | default (60 fps cap, resolution scale 1.0)                           |
| Build   | **debug** build launched through `tauri dev` (worst case, see below) |

| Process              |   CPU avg |        PSS |
| :------------------- | --------: | ---------: |
| glowframe-desktop    |    40.3 % |      98 MB |
| WebKitNetworkProcess |     0.4 % |      19 MB |
| WebKitWebProcess (1) |    84.1 % |     271 MB |
| WebKitWebProcess (2) |    86.7 % |     294 MB |
| **Total**            | **211 %** | **682 MB** |

That is roughly 2 cores busy, or 17.6 % of a 12-thread CPU, for two screens at 60 fps.

**Read this honestly.** This was a debug build under a dev server, with the editor and a browser
open at the same time. A release build should be clearly cheaper, but no release numbers have been
recorded yet. Do not quote the table above as the typical cost.

## Lowering the cost

The tray menu exposes the knobs that matter most:

- **FPS**: 15 / 30 / 60. Fewer frames per second should cut CPU roughly in proportion (not
  measured yet).
- **Resolution scale**: 0.5x / 0.75x / 1.0x. Fewer pixels shaded means less GPU work (not measured
  yet).
- The wallpaper pauses itself on battery saver and under fullscreen apps.

Compare runs by saving each to `raw/` with a clear `--label` (for example `30fps-half-res`).
