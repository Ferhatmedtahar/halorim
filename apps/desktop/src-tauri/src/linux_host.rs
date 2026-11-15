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

/// Remembers the user's current GNOME wallpaper so it can be restored on exit.
/// (The wallpaper window is opaque, so we no longer need to force a black background.)
pub fn sync_gnome_background() {
    crate::background::save_original();
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

                // Show on every workspace so switching desktops never leaves a screen without it.
                gtk_win.stick();
                // The wallpaper is fully opaque: no RGBA visual, so the compositor does not have to
                // alpha-blend two full-screen windows on every frame.

                // Fully click-through: an empty input region. The pointer position comes from the
                // GNOME Shell bridge (or from X11 itself), never from events on this window, so the
                // wallpaper can not swallow clicks meant for desktop icons, whatever the stacking.
                let region = gtk::cairo::Region::create();
                gtk_win.input_shape_combine_region(Some(&region));
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

        // 2. Pointer source. On GNOME the Shell bridge reports the pointer (XWayland only sees it
        //    while it is over an X11 window, i.e. almost never once desktop icons are on top).
        //    Everywhere else X11 is asked directly.
        let bridge = crate::gnome_bridge::start(app.clone(), monitors.clone());
        let poll_x11 = bridge == crate::gnome_bridge::BridgeStatus::Unavailable;

        // 3. Background thread: X11 pointer polling (when needed) and the battery saver check.
        let app_handle = app.clone();
        std::thread::spawn(move || {
            let x11_query = if poll_x11 { X11PointerQuery::open() } else { None };
            let mut tracker = crate::gnome_bridge::PointerTracker::default();
            let mut was_paused = false;
            let mut check_counter = 0;

            while !stop_signal.load(Ordering::Relaxed) {
                if let Some(ref query) = x11_query {
                    if let Some((x, y, is_down)) = query.query() {
                        let target = map_pointer_to_monitor(x, y, &monitors);
                        let events = tracker.update(target, is_down, true);
                        crate::gnome_bridge::emit_pointer_events(&app_handle, &events);
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
    fn test_x11_pointer_query() {
        let q = X11PointerQuery::open();
        println!("X11PointerQuery::open is_some: {}", q.is_some());
        if let Some(ref query) = q {
            let res = query.query();
            println!("X11PointerQuery::query: {:?}", res);
            assert!(res.is_some());
        }
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
