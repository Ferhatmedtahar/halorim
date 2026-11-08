use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::atomic::AtomicBool;
#[cfg(target_os = "linux")]
use std::sync::atomic::Ordering;
use std::sync::Arc;
#[cfg(target_os = "linux")]
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;
#[cfg(target_os = "linux")]
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct CursorPayload {
    pub monitor: usize,
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
    if let Ok(backend) = std::env::var("GDK_BACKEND") {
        if backend.trim().eq_ignore_ascii_case("x11") {
            return DisplayServer::X11;
        }
    }

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

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct MonitorBounds {
    pub index: usize,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

pub fn map_pointer_to_monitor(
    x: i32,
    y: i32,
    monitors: &[MonitorBounds],
) -> Option<(usize, f64, f64)> {
    if monitors.is_empty() {
        return None;
    }

    for m in monitors {
        if x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + m.height {
            let (nx, ny) = normalize_coordinates(x - m.x, y - m.y, m.width, m.height);
            return Some((m.index, nx, ny));
        }
    }

    // Boundary check for inclusive screen edges
    for m in monitors {
        if x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height {
            let (nx, ny) = normalize_coordinates(x - m.x, y - m.y, m.width, m.height);
            return Some((m.index, nx, ny));
        }
    }

    // Default to first monitor if pointer is slightly out of bounds
    let m = &monitors[0];
    let (nx, ny) = normalize_coordinates(x - m.x, y - m.y, m.width, m.height);
    Some((m.index, nx, ny))
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

pub fn sync_gnome_background() {
    #[cfg(target_os = "linux")]
    {
        if let Ok(desktop) = std::env::var("XDG_CURRENT_DESKTOP") {
            if desktop.to_uppercase().contains("GNOME") {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                let config_dir = format!("{}/.config/glowframe", home);
                let bg_path = format!("{}/background.png", config_dir);
                let _ = std::fs::create_dir_all(&config_dir);

                if !std::path::Path::new(&bg_path).exists() {
                    let black_png: &[u8] = &[
                        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
                        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
                        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
                        0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
                        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
                    ];
                    let _ = std::fs::write(&bg_path, black_png);
                }

                let uri = format!("file://{}", bg_path);
                let _ = std::process::Command::new("gsettings")
                    .args(["set", "org.gnome.desktop.background", "picture-uri", &uri])
                    .output();
                let _ = std::process::Command::new("gsettings")
                    .args(["set", "org.gnome.desktop.background", "picture-uri-dark", &uri])
                    .output();
                let _ = std::process::Command::new("gsettings")
                    .args(["set", "org.gnome.desktop.background", "primary-color", "#000000"])
                    .output();
                let _ = std::process::Command::new("gsettings")
                    .args(["set", "org.gnome.desktop.background", "secondary-color", "#000000"])
                    .output();
            }
        }
    }
}

#[cfg(target_os = "linux")]
use gtk::prelude::*;

#[cfg(target_os = "linux")]
pub fn configure_linux_window(
    window: &tauri::WebviewWindow,
    pos_x: i32,
    pos_y: i32,
    width: i32,
    height: i32,
) {
    let server = detect_display_server();

    match server {
        DisplayServer::X11 | DisplayServer::WaylandGnomeFallback => {
            eprintln!(
                "[Glowframe Linux] Configuring desktop background window at ({}, {}) {}x{} (_NET_WM_WINDOW_TYPE_DESKTOP)",
                pos_x, pos_y, width, height
            );
            if let Ok(gtk_win) = window.gtk_window() {
                gtk_win.set_decorated(false);
                gtk_win.set_skip_taskbar_hint(true);
                gtk_win.set_skip_pager_hint(true);
                gtk_win.set_accept_focus(false);
                gtk_win.set_focus_on_map(false);
                gtk_win.set_type_hint(gdk::WindowTypeHint::Desktop);
                gtk_win.set_keep_below(true);
                gtk_win.move_(pos_x, pos_y);
                gtk_win.resize(width, height);

                if let Some(screen) = gtk::prelude::GtkWindowExt::screen(&gtk_win) {
                    if let Some(visual) = screen.rgba_visual() {
                        gtk_win.set_visual(Some(&visual));
                    }
                }
                gtk_win.set_app_paintable(true);

                let empty_region = gtk::cairo::Region::create();
                gtk_win.input_shape_combine_region(Some(&empty_region));
                if let Some(gdk_win) = gtk_win.window() {
                    gdk_win.lower();
                }
                gtk_win.connect_map(|w| {
                    if let Some(gdk_win) = w.window() {
                        gdk_win.lower();
                    }
                });
            }
        }
        DisplayServer::WaylandLayerShell => {
            eprintln!(
                "[Glowframe Linux] Configuring Wayland background window at ({}, {}) {}x{}",
                pos_x, pos_y, width, height
            );
            if let Ok(gtk_win) = window.gtk_window() {
                gtk_win.set_decorated(false);
                gtk_win.set_skip_taskbar_hint(true);
                gtk_win.set_skip_pager_hint(true);
                gtk_win.set_accept_focus(false);
                gtk_win.move_(pos_x, pos_y);
                gtk_win.resize(width, height);
            }
        }
    }
}

#[cfg(not(target_os = "linux"))]
pub fn configure_linux_window(
    _window: &tauri::WebviewWindow,
    _pos_x: i32,
    _pos_y: i32,
    _width: i32,
    _height: i32,
) {}

#[cfg(target_os = "linux")]
pub struct X11PointerQuery {
    display: *mut x11::xlib::Display,
    root: x11::xlib::Window,
}

#[cfg(target_os = "linux")]
unsafe impl Send for X11PointerQuery {}

#[cfg(target_os = "linux")]
impl X11PointerQuery {
    pub fn open() -> Option<Self> {
        unsafe {
            let display = x11::xlib::XOpenDisplay(std::ptr::null());
            if display.is_null() {
                return None;
            }
            let root = x11::xlib::XDefaultRootWindow(display);
            Some(Self { display, root })
        }
    }

    pub fn query(&self) -> Option<(i32, i32, bool)> {
        unsafe {
            let mut root_return: x11::xlib::Window = 0;
            let mut child_return: x11::xlib::Window = 0;
            let mut root_x: i32 = 0;
            let mut root_y: i32 = 0;
            let mut win_x: i32 = 0;
            let mut win_y: i32 = 0;
            let mut mask: u32 = 0;

            let res = x11::xlib::XQueryPointer(
                self.display,
                self.root,
                &mut root_return,
                &mut child_return,
                &mut root_x,
                &mut root_y,
                &mut win_x,
                &mut win_y,
                &mut mask,
            );

            if res != 0 {
                // Button1Mask in X11 = (1 << 8) = 256
                let is_down = (mask & (1 << 8)) != 0;
                Some((root_x, root_y, is_down))
            } else {
                None
            }
        }
    }
}

#[cfg(target_os = "linux")]
impl Drop for X11PointerQuery {
    fn drop(&mut self) {
        unsafe {
            if !self.display.is_null() {
                x11::xlib::XCloseDisplay(self.display);
            }
        }
    }
}

pub fn start_desktop_monitor(
    app: AppHandle,
    stop_signal: Arc<AtomicBool>,
    monitors: Vec<MonitorBounds>,
) {
    #[cfg(target_os = "linux")]
    {
        // 1. Lower windows below desktop icons during initialization
        let app_handle_main = app.clone();
        let monitors_clone = monitors.clone();
        let mut init_lower_counter = 0;
        glib::timeout_add(Duration::from_millis(16), move || {
            if init_lower_counter < 30 {
                init_lower_counter += 1;
                for m in &monitors_clone {
                    let label = format!("wallpaper-{}", m.index);
                    if let Some(win) = app_handle_main.get_webview_window(&label) {
                        if let Ok(gtk_win) = win.gtk_window() {
                            if let Some(gdk_win) = gtk_win.window() {
                                gdk_win.lower();
                            }
                        }
                    }
                }
                glib::ControlFlow::Continue
            } else {
                glib::ControlFlow::Break
            }
        });

        // 2. High-performance dedicated OS polling thread for live cursor & battery saver
        let app_handle = app.clone();
        std::thread::spawn(move || {
            let x11_query = X11PointerQuery::open();
            let mut active_monitor_idx: Option<usize> = None;
            let mut last_x = -1.0;
            let mut last_y = -1.0;
            let mut was_down = false;
            let mut was_paused = false;
            let mut check_counter = 0;

            while !stop_signal.load(Ordering::Relaxed) {
                if let Some(ref query) = x11_query {
                    if let Some((x, y, is_down)) = query.query() {
                        if let Some((m_idx, norm_x, norm_y)) = map_pointer_to_monitor(x, y, &monitors) {
                            if let Some(prev_idx) = active_monitor_idx {
                                if prev_idx != m_idx {
                                    last_x = -1.0;
                                    last_y = -1.0;
                                    let leave_payload = CursorPayload {
                                        monitor: prev_idx,
                                        x: 0.0,
                                        y: 0.0,
                                    };
                                    let _ = app_handle.emit("glowframe://cursor-leave", leave_payload);
                                }
                            }
                            active_monitor_idx = Some(m_idx);

                            if (norm_x - last_x).abs() > 0.0005 || (norm_y - last_y).abs() > 0.0005 {
                                let payload = CursorPayload {
                                    monitor: m_idx,
                                    x: norm_x,
                                    y: norm_y,
                                };
                                let _ = app_handle.emit("glowframe://cursor-move", payload);
                                last_x = norm_x;
                                last_y = norm_y;
                            }

                            if is_down && !was_down {
                                let payload = CursorPayload {
                                    monitor: m_idx,
                                    x: norm_x,
                                    y: norm_y,
                                };
                                let _ = app_handle.emit("glowframe://cursor-down", payload);
                            }
                            was_down = is_down;
                        } else if let Some(prev_idx) = active_monitor_idx.take() {
                            let leave_payload = CursorPayload {
                                monitor: prev_idx,
                                x: 0.0,
                                y: 0.0,
                            };
                            let _ = app_handle.emit("glowframe://cursor-leave", leave_payload);
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

                std::thread::sleep(Duration::from_millis(16));
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (app, stop_signal, monitors);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_pointer_to_monitor() {
        let monitors = vec![
            MonitorBounds {
                index: 0,
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
            MonitorBounds {
                index: 1,
                x: 1920,
                y: 0,
                width: 1920,
                height: 1080,
            },
        ];

        // Monitor 0 center
        assert_eq!(
            map_pointer_to_monitor(960, 540, &monitors),
            Some((0, 0.5, 0.5))
        );

        // Monitor 1 center
        assert_eq!(
            map_pointer_to_monitor(2880, 540, &monitors),
            Some((1, 0.5, 0.5))
        );

        // Monitor 1 top-left corner
        assert_eq!(
            map_pointer_to_monitor(1920, 0, &monitors),
            Some((1, 0.0, 0.0))
        );

        // Empty monitors list
        assert_eq!(map_pointer_to_monitor(500, 500, &[]), None);
    }

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
        let payload = CursorPayload { monitor: 0, x: 0.42, y: 0.88 };
        let json = serde_json::to_string(&payload).unwrap();
        assert_eq!(json, "{\"monitor\":0,\"x\":0.42,\"y\":0.88}");
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
