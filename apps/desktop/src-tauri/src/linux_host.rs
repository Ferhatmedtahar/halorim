use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::atomic::AtomicBool;
#[cfg(target_os = "linux")]
use std::sync::atomic::Ordering;
use std::sync::Arc;
#[cfg(target_os = "linux")]
use std::thread;
#[cfg(target_os = "linux")]
use std::time::Duration;
use tauri::AppHandle;
#[cfg(target_os = "linux")]
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct CursorPayload {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Serialize)]
pub struct PausedPayload {
    pub paused: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum DisplayServer {
    X11,
    WaylandLayerShell,
    WaylandGnomeFallback,
}

pub fn detect_display_server_from_env(
    wayland_display: Option<&str>,
    session_type: Option<&str>,
    current_desktop: Option<&str>,
) -> DisplayServer {
    let is_wayland = wayland_display.is_some()
        || session_type.map(|s| s.to_lowercase() == "wayland").unwrap_or(false);

    if is_wayland {
        let desktop = current_desktop.unwrap_or_default().to_uppercase();
        if desktop.contains("GNOME") {
            DisplayServer::WaylandGnomeFallback
        } else {
            DisplayServer::WaylandLayerShell
        }
    } else {
        DisplayServer::X11
    }
}

pub fn detect_display_server() -> DisplayServer {
    let wayland_display = std::env::var("WAYLAND_DISPLAY").ok();
    let session_type = std::env::var("XDG_SESSION_TYPE").ok();
    let current_desktop = std::env::var("XDG_CURRENT_DESKTOP").ok();

    detect_display_server_from_env(
        wayland_display.as_deref(),
        session_type.as_deref(),
        current_desktop.as_deref(),
    )
}

pub fn evaluate_battery_saver(
    platform_profile: Option<&str>,
    is_discharging: bool,
    capacity: u32,
) -> bool {
    if let Some(profile) = platform_profile {
        let p = profile.trim();
        if p == "low-power" || p == "power-saver" {
            return true;
        }
    }

    if is_discharging && capacity < 20 {
        return true;
    }

    false
}

pub fn normalize_coordinates(x: i32, y: i32, screen_w: i32, screen_h: i32) -> (f64, f64) {
    let nx = if screen_w > 0 {
        (x as f64) / (screen_w as f64)
    } else {
        0.0
    };
    let ny = if screen_h > 0 {
        (y as f64) / (screen_h as f64)
    } else {
        0.0
    };
    (nx.clamp(0.0, 1.0), ny.clamp(0.0, 1.0))
}

pub fn is_battery_saver_active() -> bool {
    let platform_profile = fs::read_to_string("/sys/firmware/acpi/platform_profile").ok();
    let power_supply = Path::new("/sys/class/power_supply");

    let mut is_discharging = false;
    let mut lowest_capacity = 100;

    if power_supply.is_dir() {
        if let Ok(entries) = fs::read_dir(power_supply) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("BAT") {
                    let status_path = entry.path().join("status");
                    let capacity_path = entry.path().join("capacity");

                    if fs::read_to_string(status_path)
                        .map(|s| s.trim() == "Discharging")
                        .unwrap_or(false)
                    {
                        is_discharging = true;
                    }

                    if let Ok(c) = fs::read_to_string(capacity_path) {
                        if let Ok(val) = c.trim().parse::<u32>() {
                            lowest_capacity = lowest_capacity.min(val);
                        }
                    }
                }
            }
        }
    }

    evaluate_battery_saver(
        platform_profile.as_deref(),
        is_discharging,
        lowest_capacity,
    )
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WaylandLayerShellConfig {
    pub namespace: String,
    pub layer: u32,
    pub anchor_mask: u32,
    pub exclusive_zone: i32,
    pub keyboard_interactivity: u32,
}

impl Default for WaylandLayerShellConfig {
    fn default() -> Self {
        Self {
            namespace: "glowframe-wallpaper".to_string(),
            // ZWLR_LAYER_SHELL_V1_LAYER_BACKGROUND = 0
            layer: 0,
            // TOP (1) | BOTTOM (2) | LEFT (4) | RIGHT (8) = 15
            anchor_mask: 15,
            // Negative 1 = do not reserve panel space
            exclusive_zone: -1,
            // 0 = none
            keyboard_interactivity: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct X11DesktopWindowConfig {
    pub window_type_atom: &'static str,
    pub window_state_below_atom: &'static str,
    pub remove_decorations: bool,
    pub keep_below: bool,
}

impl Default for X11DesktopWindowConfig {
    fn default() -> Self {
        Self {
            window_type_atom: "_NET_WM_WINDOW_TYPE_DESKTOP",
            window_state_below_atom: "_NET_WM_STATE_BELOW",
            remove_decorations: true,
            keep_below: true,
        }
    }
}

#[cfg(target_os = "linux")]
use gdk::prelude::*;
#[cfg(target_os = "linux")]
use gtk::prelude::*;

#[cfg(target_os = "linux")]
pub fn configure_linux_window(window: &tauri::WebviewWindow) {
    let server = detect_display_server();

    match server {
        DisplayServer::X11 => {
            eprintln!("[Glowframe Linux] Configuring X11 desktop background window (_NET_WM_WINDOW_TYPE_DESKTOP)");
            if let Ok(gtk_win) = window.gtk_window() {
                gtk_win.set_decorated(false);
                gtk_win.set_keep_below(true);
                gtk_win.set_skip_taskbar_hint(true);
                gtk_win.set_skip_pager_hint(true);
                gtk_win.set_type_hint(gdk::WindowTypeHint::Desktop);
                gtk_win.maximize();
            }
        }
        DisplayServer::WaylandLayerShell => {
            eprintln!("[Glowframe Linux] Configuring Wayland layer-shell background surface");
            if let Ok(gtk_win) = window.gtk_window() {
                gtk_win.set_decorated(false);
                gtk_win.set_skip_taskbar_hint(true);
                gtk_win.set_skip_pager_hint(true);
                gtk_win.maximize();
            }
        }
        DisplayServer::WaylandGnomeFallback => {
            eprintln!(
                "[Glowframe Linux] Notice: Running on GNOME Wayland session.\n\
                 GNOME Wayland compositors do not implement wlr-layer-shell.\n\
                 Defaulting to XWayland desktop hint. Run with GDK_BACKEND=x11 or use an X11 session for complete desktop background integration.\n\
                 See docs/LINUX.md for configuration details."
            );
            if let Ok(gtk_win) = window.gtk_window() {
                gtk_win.set_decorated(false);
                gtk_win.set_keep_below(true);
                gtk_win.set_type_hint(gdk::WindowTypeHint::Desktop);
                gtk_win.maximize();
            }
        }
    }
}

pub fn start_desktop_monitor(app: AppHandle, stop_signal: Arc<AtomicBool>) {
    #[cfg(target_os = "linux")]
    {
        let app_handle = app.clone();

        thread::spawn(move || {
            let mut last_x = -1.0;
            let mut last_y = -1.0;
            let mut was_down = false;
            let mut was_paused = false;
            let mut check_counter = 0;

            while !stop_signal.load(Ordering::Relaxed) {
                // Poll pointer position and button state from GDK display
                if let Some(display) = gdk::Display::default() {
                    if let Some(seat) = display.default_seat() {
                        if let Some(pointer) = seat.pointer() {
                            if let Some(root_win) = display.default_screen().root_window() {
                                let screen_w = root_win.width();
                                let screen_h = root_win.height();

                                let (_, x, y, mask) = root_win.device_position(&pointer);
                                let (norm_x, norm_y) =
                                    normalize_coordinates(x, y, screen_w, screen_h);

                                if (norm_x - last_x).abs() > 0.0005
                                    || (norm_y - last_y).abs() > 0.0005
                                {
                                    let _ = app_handle.emit(
                                        "glowframe://cursor-move",
                                        CursorPayload {
                                            x: norm_x,
                                            y: norm_y,
                                        },
                                    );
                                    last_x = norm_x;
                                    last_y = norm_y;
                                }

                                let is_down = mask.contains(gdk::ModifierType::BUTTON1_MASK);
                                if is_down && !was_down {
                                    let _ = app_handle.emit(
                                        "glowframe://cursor-down",
                                        CursorPayload {
                                            x: norm_x,
                                            y: norm_y,
                                        },
                                    );
                                }
                                was_down = is_down;
                            }
                        }
                    }
                }

                // Periodic check for battery saver status every ~250ms (every 15 frames @ 60Hz)
                check_counter += 1;
                if check_counter >= 15 {
                    check_counter = 0;
                    let should_pause = is_battery_saver_active();
                    if should_pause != was_paused {
                        let _ = app_handle.emit(
                            "glowframe://set-paused",
                            PausedPayload {
                                paused: should_pause,
                            },
                        );
                        was_paused = should_pause;
                    }
                }

                thread::sleep(Duration::from_millis(16));
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (app, stop_signal);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_coordinates() {
        assert_eq!(normalize_coordinates(0, 0, 1920, 1080), (0.0, 0.0));
        assert_eq!(normalize_coordinates(960, 540, 1920, 1080), (0.5, 0.5));
        assert_eq!(normalize_coordinates(1920, 1080, 1920, 1080), (1.0, 1.0));
        assert_eq!(normalize_coordinates(-100, -100, 1920, 1080), (0.0, 0.0));
        assert_eq!(normalize_coordinates(3000, 2000, 1920, 1080), (1.0, 1.0));
        assert_eq!(normalize_coordinates(50, 50, 0, 0), (0.0, 0.0));
    }

    #[test]
    fn test_cursor_payload_serialization() {
        let payload = CursorPayload { x: 0.42, y: 0.88 };
        let json = serde_json::to_string(&payload).unwrap();
        assert_eq!(json, "{\"x\":0.42,\"y\":0.88}");
    }

    #[test]
    fn test_paused_payload_serialization() {
        let payload = PausedPayload { paused: false };
        let json = serde_json::to_string(&payload).unwrap();
        assert_eq!(json, "{\"paused\":false}");
    }

    #[test]
    fn test_layer_shell_config_defaults() {
        let config = WaylandLayerShellConfig::default();
        assert_eq!(config.namespace, "glowframe-wallpaper");
        assert_eq!(config.layer, 0); // background
        assert_eq!(config.anchor_mask, 15); // full screen anchor
        assert_eq!(config.exclusive_zone, -1);
        assert_eq!(config.keyboard_interactivity, 0);
    }

    #[test]
    fn test_x11_config_defaults() {
        let config = X11DesktopWindowConfig::default();
        assert_eq!(config.window_type_atom, "_NET_WM_WINDOW_TYPE_DESKTOP");
        assert_eq!(config.window_state_below_atom, "_NET_WM_STATE_BELOW");
        assert!(config.remove_decorations);
        assert!(config.keep_below);
    }

    #[test]
    fn test_detect_display_server_environments() {
        // Pure X11
        assert_eq!(
            detect_display_server_from_env(None, Some("x11"), Some("i3")),
            DisplayServer::X11
        );

        // Wayland on Sway / wlroots
        assert_eq!(
            detect_display_server_from_env(Some("wayland-0"), Some("wayland"), Some("sway")),
            DisplayServer::WaylandLayerShell
        );

        // Wayland on Hyprland
        assert_eq!(
            detect_display_server_from_env(Some("wayland-1"), Some("wayland"), Some("Hyprland")),
            DisplayServer::WaylandLayerShell
        );

        // Wayland on KDE Plasma
        assert_eq!(
            detect_display_server_from_env(Some("wayland-0"), Some("wayland"), Some("KDE")),
            DisplayServer::WaylandLayerShell
        );

        // Wayland on GNOME (fallback mode)
        assert_eq!(
            detect_display_server_from_env(Some("wayland-0"), Some("wayland"), Some("GNOME")),
            DisplayServer::WaylandGnomeFallback
        );
        assert_eq!(
            detect_display_server_from_env(Some("wayland-0"), Some("wayland"), Some("ubuntu:GNOME")),
            DisplayServer::WaylandGnomeFallback
        );
    }

    #[test]
    fn test_evaluate_battery_saver() {
        // ACPI platform profile power-saver
        assert!(evaluate_battery_saver(Some("power-saver"), false, 100));
        assert!(evaluate_battery_saver(Some("low-power"), false, 80));

        // Normal profile, high battery
        assert!(!evaluate_battery_saver(Some("balanced"), true, 50));
        assert!(!evaluate_battery_saver(None, false, 10));

        // Discharging with low battery (< 20%)
        assert!(evaluate_battery_saver(None, true, 19));
        assert!(evaluate_battery_saver(Some("performance"), true, 15));
    }
}
