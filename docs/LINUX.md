# Glowframe Linux Desktop Runner Guide

Glowframe provides interactive, real-time prismatic rim dispersion wallpapers on Linux across X11 and Wayland environments.

---

## 1. Architecture Overview

On Linux, the desktop runner (`@glowframe/desktop`) operates as a lightweight, hardware-accelerated Tauri application running the core WebGL2 engine behind normal application windows.

The runner automatically detects the active display server and compositor:

| Environment                                             | Mechanism                                                           | Status              |
| :------------------------------------------------------ | :------------------------------------------------------------------ | :------------------ |
| **X11** (i3, bspwm, XFCE, Openbox, KDE X11, GNOME Xorg) | EWMH/NetWM `_NET_WM_WINDOW_TYPE_DESKTOP` + `_NET_WM_STATE_BELOW`    | Fully Supported     |
| **Wayland (wlroots)** (Sway, Hyprland, Wayfire, River)  | `wlr-layer-shell` protocol (`ZWLR_LAYER_SHELL_V1_LAYER_BACKGROUND`) | Fully Supported     |
| **Wayland (KDE Plasma)**                                | KWin layer surface protocol                                         | Fully Supported     |
| **Wayland (GNOME Shell)**                               | Mutter security restrictions (no layer-shell support)               | Documented Fallback |

---

## 2. X11 Window Managers

On X11, Glowframe creates an unbordered window sized to the monitor dimensions and applies standard Extended Window Manager Hints (EWMH):

- **Window Type**: `_NET_WM_WINDOW_TYPE_DESKTOP`
- **Window State**: `_NET_WM_STATE_BELOW`
- **Decorations**: Disabled via `_MOTIF_WM_HINTS`
- **Stacking**: Automatically kept at the bottom of the window stack

### Window Manager Integration

- **i3 / Sway (XWayland)**:

  ```config
  # ~/.config/i3/config
  for_window [class="glowframe-desktop"] floating enable, border none, sticky enable
  exec_always --no-startup-id glowframe-desktop
  ```

- **bspwm**:
  ```bash
  # ~/.config/bspwm/bspwmrc
  bspc rule -a glowframe-desktop state=floating layer=below border=off
  ```

---

## 3. Wayland Compositors (wlroots & KDE)

On compositors implementing the `wlr-layer-shell-unstable-v1` protocol:

- **Namespace**: `glowframe-wallpaper`
- **Layer**: `background` (Layer 0)
- **Anchor**: `top | bottom | left | right` (full screen)
- **Exclusive Zone**: `-1` (does not push status bars or dock panels)
- **Keyboard Interactivity**: `none` (prevents stealing keyboard focus)

### Hyprland Configuration

```ini
# ~/.config/hypr/hyprland.conf
exec-once = glowframe-desktop
windowrule = float, ^(glowframe-desktop)$
windowrule = pin, ^(glowframe-desktop)$
```

### Sway Configuration

```config
# ~/.config/sway/config
exec glowframe-desktop
```

---

## 4. GNOME on Wayland Limitations & Fallbacks

> [!WARNING]
> **GNOME on Wayland architectural limitation**: GNOME Shell (Mutter) does not implement the `wlr-layer-shell` protocol and deliberately disallows unprivileged client windows from attaching to the desktop background layer on pure Wayland sessions.

When running in a GNOME Wayland session, Glowframe logs a diagnostic notice and activates the compatibility fallback.

### Recommended Workarounds for GNOME Users:

1. **GNOME on Xorg (Recommended for 100% interactive wallpaper)**:
   - At the GDM login screen, click the gear icon in the bottom right corner and select **"GNOME on Xorg"**.
   - Glowframe attaches directly to the desktop root window via `_NET_WM_WINDOW_TYPE_DESKTOP`.

2. **XWayland Backend Fallback**:
   - Launch Glowframe forcing the X11 backend through XWayland:
     ```bash
     GDK_BACKEND=x11 glowframe-desktop
     ```

3. **Standalone HTML Pack with GNOME Extensions**:
   - Download the standalone `.zip` HTML pack from the Glowframe library site (`/w/<id>`).
   - Extract the pack and load it into a GNOME background extension (such as Hanabi or Desktop Wallpaper extension).

---

## 5. Power & Fullscreen Management

Glowframe actively conserves CPU and GPU resources:

- **Fullscreen Pause**: Automatically detects when a focused window enters fullscreen mode or fully occludes the display, pausing the WebGL render loop (`setPaused(true)`).
- **Battery Saver**: Continuously inspects `/sys/class/power_supply` and ACPI platform profiles. When the device is discharging and battery capacity drops below 20%, or when the system profile is set to `low-power` or `power-saver`, rendering pauses until power is restored.

---

## 6. Systemd User Service Setup

To run Glowframe automatically on login as a background service:

1. Create `~/.config/systemd/user/glowframe.service`:

   ```ini
   [Unit]
   Description=Glowframe Desktop Wallpaper Engine
   After=graphical-session.target
   PartOf=graphical-session.target

   [Service]
   Type=simple
   ExecStart=/usr/local/bin/glowframe-desktop
   Restart=on-failure
   RestartSec=3s
   Environment=DISPLAY=:0

   [Install]
   WantedBy=graphical-session.target
   ```

2. Enable and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now glowframe.service
   ```
