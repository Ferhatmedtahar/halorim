//! GNOME Shell integration.
//!
//! On GNOME Wayland an application can neither be the desktop background nor read the mouse
//! position. The "Glowframe Desktop Bridge" Shell extension (apps/desktop/gnome-extension) does both
//! from inside the Shell: it shows our windows as the real background, under the desktop icons, and
//! publishes the pointer on D-Bus. This module ships that extension inside the binary, keeps the
//! installed copy up to date and turns its D-Bus signals into the cursor events the webviews expect.

use std::path::PathBuf;

pub const EXTENSION_UUID: &str = "glowframe-pointer@glowframe.dev";
/// Version of the bridge this build talks to (the `version` the extension reports).
pub const BRIDGE_VERSION: u32 = 2;

const EXTENSION_JS: &str =
    include_str!("../../gnome-extension/glowframe-pointer@glowframe.dev/extension.js");
const METADATA_JSON: &str =
    include_str!("../../gnome-extension/glowframe-pointer@glowframe.dev/metadata.json");

/// Button 1 in the modifier mask reported by the Shell (same bit as X11's Button1Mask).
pub const BUTTON1_MASK: u32 = 1 << 8;

static LIVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// True once the running Shell's bridge shows the live wallpaper (desktop, overview, workspaces).
pub fn is_live() -> bool {
    LIVE.load(std::sync::atomic::Ordering::Relaxed)
}

pub fn is_gnome_session(current_desktop: Option<&str>) -> bool {
    current_desktop
        .map(|d| d.to_uppercase().contains("GNOME"))
        .unwrap_or(false)
}

/// Where the user's Shell extensions live.
pub fn extension_dir(xdg_data_home: Option<&str>, home: &str) -> PathBuf {
    let base = match xdg_data_home {
        Some(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => PathBuf::from(home).join(".local").join("share"),
    };
    base.join("gnome-shell").join("extensions").join(EXTENSION_UUID)
}

/// True when the installed file is missing or differs from the copy shipped in this binary.
pub fn needs_update(installed: Option<&str>, shipped: &str) -> bool {
    installed != Some(shipped)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallOutcome {
    /// The installed extension already matches this build.
    UpToDate,
    /// Files were written. A running Shell keeps using what it loaded at login, so the new version
    /// only becomes active after logging out and back in.
    Updated,
    Failed,
}

/// Installs or updates the bridge extension in the user's extension directory and enables it.
pub fn install_extension() -> InstallOutcome {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let data_home = std::env::var("XDG_DATA_HOME").ok();
    let dir = extension_dir(data_home.as_deref(), &home);

    let files = [("extension.js", EXTENSION_JS), ("metadata.json", METADATA_JSON)];
    let stale = files.iter().any(|(name, shipped)| {
        needs_update(std::fs::read_to_string(dir.join(name)).ok().as_deref(), shipped)
    });

    let mut outcome = InstallOutcome::UpToDate;
    if stale {
        if std::fs::create_dir_all(&dir).is_err() {
            return InstallOutcome::Failed;
        }
        for (name, shipped) in files {
            if std::fs::write(dir.join(name), shipped).is_err() {
                return InstallOutcome::Failed;
            }
        }
        outcome = InstallOutcome::Updated;
    }
    enable_extension();
    outcome
}

/// Adds the bridge to the Shell's enabled extensions (no-op when it is already there).
fn enable_extension() {
    use std::process::Command;
    let enabled = Command::new("gnome-extensions")
        .args(["enable", EXTENSION_UUID])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if enabled {
        return;
    }
    // A Shell that has not loaded the extension yet refuses `enable`: set the key it reads at login.
    let current = Command::new("gsettings")
        .args(["get", "org.gnome.shell", "enabled-extensions"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
    if let Some(list) = current.as_deref().and_then(with_extension_enabled) {
        let _ = Command::new("gsettings")
            .args(["set", "org.gnome.shell", "enabled-extensions", &list])
            .output();
    }
}

/// Returns the GVariant text of `list` with the bridge appended, or None when it is already listed
/// or the text is not a string array.
pub fn with_extension_enabled(list: &str) -> Option<String> {
    let list = list.trim().trim_start_matches("@as").trim();
    if !list.starts_with('[') || !list.ends_with(']') {
        return None;
    }
    if list.contains(&format!("'{}'", EXTENSION_UUID)) {
        return None;
    }
    let inner = list[1..list.len() - 1].trim();
    Some(if inner.is_empty() {
        format!("['{}']", EXTENSION_UUID)
    } else {
        format!("[{}, '{}']", inner, EXTENSION_UUID)
    })
}

// --- pointer events ------------------------------------------------------------------------------

/// What the webviews have to be told after one pointer sample.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct PointerEvents {
    /// Wallpaper the pointer just left.
    pub leave: Option<usize>,
    /// Wallpaper index and normalized position, when it moved.
    pub moved: Option<(usize, f64, f64)>,
    /// A click that landed on the desktop.
    pub down: Option<(usize, f64, f64)>,
}

/// Turns raw pointer samples (from the Shell bridge or from X11) into move / click / leave events.
#[derive(Debug, Default)]
pub struct PointerTracker {
    active: Option<usize>,
    last: Option<(f64, f64)>,
    was_down: bool,
}

impl PointerTracker {
    /// `target`: wallpaper under the pointer with the normalized position, or None when the pointer
    /// is on no wallpaper.
    pub fn update(
        &mut self,
        target: Option<(usize, f64, f64)>,
        button_down: bool,
        on_desktop: bool,
    ) -> PointerEvents {
        let mut events = PointerEvents::default();
        match target {
            Some((index, x, y)) => {
                if let Some(prev) = self.active {
                    if prev != index {
                        events.leave = Some(prev);
                        self.last = None;
                    }
                }
                self.active = Some(index);
                let moved = match self.last {
                    Some((lx, ly)) => (x - lx).abs() > 0.0005 || (y - ly).abs() > 0.0005,
                    None => true,
                };
                if moved {
                    events.moved = Some((index, x, y));
                    self.last = Some((x, y));
                }
                if button_down && !self.was_down && on_desktop {
                    events.down = Some((index, x, y));
                }
            }
            None => {
                if let Some(prev) = self.active.take() {
                    events.leave = Some(prev);
                }
                self.last = None;
            }
        }
        self.was_down = button_down;
        events
    }
}

#[cfg(target_os = "linux")]
pub use linux::{emit_pointer_events, start, BridgeStatus};

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use crate::linux_host::{map_pointer_to_monitor, CursorPayload, MonitorBounds};
    use gtk::gio;
    use gtk::glib;
    use std::cell::RefCell;
    use std::rc::Rc;
    use tauri::{AppHandle, Emitter};

    const BUS_NAME: &str = "org.gnome.Shell";
    const OBJECT_PATH: &str = "/dev/glowframe/Pointer";
    const INTERFACE: &str = "dev.glowframe.Pointer";

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum BridgeStatus {
        /// The Shell runs the current bridge: live background and pushed pointer events.
        Live,
        /// The Shell still runs an older bridge (pointer only). Current files are installed and take
        /// over at the next login.
        NeedsRelogin,
        /// No bridge in this session (not GNOME, or the extension has never been loaded).
        Unavailable,
    }

    thread_local! {
        // Keeps the session bus connection (and with it the signal subscription) alive.
        static CONNECTION: RefCell<Option<gio::DBusConnection>> = const { RefCell::new(None) };
    }

    pub fn emit_pointer_events(app: &AppHandle, events: &PointerEvents) {
        if let Some(monitor) = events.leave {
            let _ = app.emit("glowframe://cursor-leave", CursorPayload { monitor, x: 0.0, y: 0.0 });
        }
        if let Some((monitor, x, y)) = events.moved {
            let _ = app.emit("glowframe://cursor-move", CursorPayload { monitor, x, y });
        }
        if let Some((monitor, x, y)) = events.down {
            let _ = app.emit("glowframe://cursor-down", CursorPayload { monitor, x, y });
        }
    }

    fn call_sync(conn: &gio::DBusConnection, method: &str) -> Result<glib::Variant, glib::Error> {
        conn.call_sync(
            Some(BUS_NAME),
            OBJECT_PATH,
            INTERFACE,
            method,
            None,
            None,
            gio::DBusCallFlags::NONE,
            1000,
            gio::Cancellable::NONE,
        )
    }

    /// Must be called on the GTK main thread. Installs/updates the extension, then connects to the
    /// bridge of the running Shell. Returns what this session can do.
    pub fn start(app: AppHandle, monitors: Vec<MonitorBounds>) -> BridgeStatus {
        let desktop = std::env::var("XDG_CURRENT_DESKTOP").ok();
        if !is_gnome_session(desktop.as_deref()) {
            return BridgeStatus::Unavailable;
        }

        let installed = install_extension();
        let conn = match gio::bus_get_sync(gio::BusType::Session, gio::Cancellable::NONE) {
            Ok(conn) => conn,
            Err(e) => {
                eprintln!("[Glowframe] No session bus, desktop bridge unavailable: {}", e);
                return BridgeStatus::Unavailable;
            }
        };

        let running_version = call_sync(&conn, "GetVersion")
            .ok()
            .and_then(|v| v.get::<(u32,)>())
            .map(|(v,)| v);

        let status = match running_version {
            // Same bridge version already running: it works as is. Freshly written files (e.g. a new
            // display name) are picked up quietly at the next login, no need to bother the user.
            Some(v) if v >= BRIDGE_VERSION => {
                subscribe_pointer(&conn, app);
                super::LIVE.store(true, std::sync::atomic::Ordering::Relaxed);
                // A still snapshot left as the GNOME background by an earlier run is not needed.
                crate::background::restore_original();
                BridgeStatus::Live
            }
            Some(_) => {
                // A newer-than-v1 bridge that is about to be replaced still pushes pointer events.
                subscribe_pointer(&conn, app);
                BridgeStatus::NeedsRelogin
            }
            None if call_sync(&conn, "GetState").is_ok() => {
                poll_legacy_pointer(&conn, app, monitors);
                BridgeStatus::NeedsRelogin
            }
            None => {
                if installed == InstallOutcome::Failed {
                    eprintln!("[Glowframe] Could not install the GNOME Shell bridge extension.");
                    BridgeStatus::Unavailable
                } else {
                    BridgeStatus::NeedsRelogin
                }
            }
        };

        match status {
            BridgeStatus::Live => eprintln!("[Glowframe] GNOME Shell bridge v{} active.", BRIDGE_VERSION),
            BridgeStatus::NeedsRelogin => {
                eprintln!(
                    "[Glowframe] GNOME Shell bridge v{} installed. Log out and back in once to activate it \
                     (live background under the desktop icons, overview and workspace switching).",
                    BRIDGE_VERSION
                );
                let _ = std::process::Command::new("notify-send")
                    .args([
                        "--app-name=Halorim",
                        "Halorim: log out and back in once",
                        "The desktop integration was updated. After the next login the live wallpaper \
                         stays under your desktop icons and keeps moving in the overview.",
                    ])
                    .spawn();
            }
            BridgeStatus::Unavailable => {}
        }

        CONNECTION.with(|c| *c.borrow_mut() = Some(conn));
        status
    }

    /// Current bridge: the Shell pushes (index, x, y, buttons, onDesktop) whenever the pointer changes.
    fn subscribe_pointer(conn: &gio::DBusConnection, app: AppHandle) {
        let tracker = Rc::new(RefCell::new(PointerTracker::default()));
        let _id = conn.signal_subscribe(
            Some(BUS_NAME),
            Some(INTERFACE),
            Some("Pointer"),
            Some(OBJECT_PATH),
            None,
            gio::DBusSignalFlags::NONE,
            move |_conn, _sender, _path, _iface, _signal, params| {
                let Some((index, x, y, buttons, on_desktop)) =
                    params.get::<(i32, f64, f64, u32, bool)>()
                else {
                    return;
                };
                let target = if index >= 0 { Some((index as usize, x, y)) } else { None };
                let events =
                    tracker.borrow_mut().update(target, buttons & BUTTON1_MASK != 0, on_desktop);
                emit_pointer_events(&app, &events);
            },
        );
    }

    /// Bridge v1 (only until the next login): it pushes nothing useful, so ask it ~30 times a second.
    fn poll_legacy_pointer(conn: &gio::DBusConnection, app: AppHandle, monitors: Vec<MonitorBounds>) {
        let conn = conn.clone();
        let tracker = Rc::new(RefCell::new(PointerTracker::default()));
        let monitors = Rc::new(monitors);
        let busy = Rc::new(std::cell::Cell::new(false));
        glib::timeout_add_local(std::time::Duration::from_millis(33), move || {
            if busy.get() {
                return glib::ControlFlow::Continue; // previous answer still on its way
            }
            busy.set(true);
            let (app, tracker, monitors, busy) =
                (app.clone(), tracker.clone(), monitors.clone(), busy.clone());
            conn.call(
                Some(BUS_NAME),
                OBJECT_PATH,
                INTERFACE,
                "GetState",
                None,
                None,
                gio::DBusCallFlags::NONE,
                500,
                gio::Cancellable::NONE,
                move |reply| {
                    busy.set(false);
                    let Some((x, y, buttons, on_desktop)) =
                        reply.ok().and_then(|v| v.get::<(i32, i32, u32, bool)>())
                    else {
                        return;
                    };
                    let target = map_pointer_to_monitor(x, y, &monitors);
                    let events =
                        tracker.borrow_mut().update(target, buttons & BUTTON1_MASK != 0, on_desktop);
                    emit_pointer_events(&app, &events);
                },
            );
            glib::ControlFlow::Continue
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_dir_honours_xdg_data_home() {
        assert_eq!(
            extension_dir(None, "/home/u"),
            PathBuf::from("/home/u/.local/share/gnome-shell/extensions/glowframe-pointer@glowframe.dev")
        );
        assert_eq!(
            extension_dir(Some("/data"), "/home/u"),
            PathBuf::from("/data/gnome-shell/extensions/glowframe-pointer@glowframe.dev")
        );
        assert_eq!(
            extension_dir(Some(""), "/home/u"),
            PathBuf::from("/home/u/.local/share/gnome-shell/extensions/glowframe-pointer@glowframe.dev")
        );
    }

    #[test]
    fn update_needed_only_when_content_differs() {
        assert!(needs_update(None, "a"));
        assert!(needs_update(Some("old"), "a"));
        assert!(!needs_update(Some("a"), "a"));
    }

    #[test]
    fn shipped_extension_reports_this_bridge_version() {
        assert!(EXTENSION_JS.contains(&format!("const BRIDGE_VERSION = {};", BRIDGE_VERSION)));
        let meta: serde_json::Value = serde_json::from_str(METADATA_JSON).unwrap();
        assert_eq!(meta["uuid"], EXTENSION_UUID);
        assert_eq!(meta["version"], BRIDGE_VERSION);
    }

    #[test]
    fn enabling_appends_once() {
        assert_eq!(
            with_extension_enabled("['a@b', 'c@d']").as_deref(),
            Some("['a@b', 'c@d', 'glowframe-pointer@glowframe.dev']")
        );
        assert_eq!(
            with_extension_enabled("@as []").as_deref(),
            Some("['glowframe-pointer@glowframe.dev']")
        );
        assert_eq!(with_extension_enabled("['glowframe-pointer@glowframe.dev']"), None);
        assert_eq!(with_extension_enabled("not a list"), None);
    }

    #[test]
    fn gnome_detection() {
        assert!(is_gnome_session(Some("ubuntu:GNOME")));
        assert!(is_gnome_session(Some("gnome")));
        assert!(!is_gnome_session(Some("KDE")));
        assert!(!is_gnome_session(None));
    }

    #[test]
    fn tracker_reports_move_once_per_position() {
        let mut t = PointerTracker::default();
        let e = t.update(Some((0, 0.5, 0.5)), false, true);
        assert_eq!(e.moved, Some((0, 0.5, 0.5)));
        assert_eq!(e.leave, None);
        assert_eq!(t.update(Some((0, 0.5, 0.5)), false, true), PointerEvents::default());
        assert_eq!(t.update(Some((0, 0.6, 0.5)), false, true).moved, Some((0, 0.6, 0.5)));
    }

    #[test]
    fn tracker_leaves_previous_wallpaper_when_crossing_monitors() {
        let mut t = PointerTracker::default();
        t.update(Some((0, 0.99, 0.5)), false, true);
        let e = t.update(Some((1, 0.01, 0.5)), false, true);
        assert_eq!(e.leave, Some(0));
        assert_eq!(e.moved, Some((1, 0.01, 0.5)));
        let e = t.update(None, false, true);
        assert_eq!(e.leave, Some(1));
        assert_eq!(t.update(None, false, true), PointerEvents::default());
    }

    #[test]
    fn tracker_clicks_only_on_press_edge_over_desktop() {
        let mut t = PointerTracker::default();
        t.update(Some((0, 0.5, 0.5)), false, true);
        assert_eq!(t.update(Some((0, 0.5, 0.5)), true, true).down, Some((0, 0.5, 0.5)));
        assert_eq!(t.update(Some((0, 0.5, 0.5)), true, true).down, None); // still held
        t.update(Some((0, 0.5, 0.5)), false, true);
        assert_eq!(t.update(Some((0, 0.5, 0.5)), true, false).down, None); // click on an app window
    }
}
