use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
struct ScenePayload {
    #[serde(rename = "presetId")]
    preset_id: &'static str,
}

#[derive(Clone, Serialize)]
struct FpsPayload {
    fps: u32,
}

#[derive(Clone, Serialize)]
struct ScalePayload {
    scale: f64,
}

#[derive(Clone, Serialize)]
struct PausedPayload {
    paused: bool,
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Presets Submenu
    let preset_triangle = MenuItem::with_id(app, "preset_triangle", "Triangle Prism", true, None::<&str>)?;
    let preset_tux = MenuItem::with_id(app, "preset_tux", "Tux Prism", true, None::<&str>)?;
    let preset_fourpane = MenuItem::with_id(app, "preset_fourpane", "Four-Pane", true, None::<&str>)?;
    let preset_hexagon = MenuItem::with_id(app, "preset_hexagon", "Hexagon Prism", true, None::<&str>)?;
    let preset_cyber = MenuItem::with_id(app, "preset_cyber", "Cyber Star", true, None::<&str>)?;
    let preset_matrix = MenuItem::with_id(app, "preset_matrix", "Matrix Circle", true, None::<&str>)?;

    let presets_menu = Submenu::with_items(
        app,
        "Presets",
        true,
        &[
            &preset_triangle,
            &preset_tux,
            &preset_fourpane,
            &preset_hexagon,
            &preset_cyber,
            &preset_matrix,
        ],
    )?;

    // 2. FPS Cap Submenu
    let fps_15 = MenuItem::with_id(app, "fps_15", "15 FPS (Battery Saver)", true, None::<&str>)?;
    let fps_30 = MenuItem::with_id(app, "fps_30", "30 FPS (Default)", true, None::<&str>)?;
    let fps_60 = MenuItem::with_id(app, "fps_60", "60 FPS (Smooth)", true, None::<&str>)?;

    let fps_menu = Submenu::with_items(app, "Performance (FPS)", true, &[&fps_15, &fps_30, &fps_60])?;

    // 3. Resolution Scale Submenu
    let scale_05 = MenuItem::with_id(app, "scale_05", "0.5x Scale (Performance)", true, None::<&str>)?;
    let scale_075 = MenuItem::with_id(app, "scale_075", "0.75x Scale (Balanced)", true, None::<&str>)?;
    let scale_10 = MenuItem::with_id(app, "scale_10", "1.0x Scale (Native)", true, None::<&str>)?;

    let scale_menu = Submenu::with_items(
        app,
        "Resolution Scale",
        true,
        &[&scale_05, &scale_075, &scale_10],
    )?;

    // 4. General Controls
    let toggle_pause = MenuItem::with_id(app, "toggle_pause", "Pause / Resume", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Glowframe", true, None::<&str>)?;

    let root_menu = Menu::with_items(
        app,
        &[
            &presets_menu,
            &fps_menu,
            &scale_menu,
            &toggle_pause,
            &quit_item,
        ],
    )?;

    let is_paused = Arc::new(AtomicBool::new(false));

    let tray_icon = tauri::include_image!("icons/32x32.png");

    let tray_builder = TrayIconBuilder::with_id("glowframe-tray")
        .tooltip("Glowframe")
        .icon(tray_icon)
        .menu(&root_menu)
        .show_menu_on_left_click(true);

    tray_builder
        .on_menu_event(move |app_handle, event| {
            let id = event.id.as_ref();
            match id {
                "preset_triangle" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "triangle-prism" });
                }
                "preset_tux" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "tux-prism" });
                }
                "preset_fourpane" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "four-pane" });
                }
                "preset_hexagon" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "hexagon-prism" });
                }
                "preset_cyber" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "cyber-star" });
                }
                "preset_matrix" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "matrix-circle" });
                }
                "fps_15" => {
                    let _ = app_handle.emit("glowframe://set-fps-cap", FpsPayload { fps: 15 });
                }
                "fps_30" => {
                    let _ = app_handle.emit("glowframe://set-fps-cap", FpsPayload { fps: 30 });
                }
                "fps_60" => {
                    let _ = app_handle.emit("glowframe://set-fps-cap", FpsPayload { fps: 60 });
                }
                "scale_05" => {
                    let _ = app_handle.emit("glowframe://set-resolution-scale", ScalePayload { scale: 0.5 });
                }
                "scale_075" => {
                    let _ = app_handle.emit("glowframe://set-resolution-scale", ScalePayload { scale: 0.75 });
                }
                "scale_10" => {
                    let _ = app_handle.emit("glowframe://set-resolution-scale", ScalePayload { scale: 1.0 });
                }
                "toggle_pause" => {
                    let current = is_paused.load(Ordering::Relaxed);
                    let next = !current;
                    is_paused.store(next, Ordering::Relaxed);
                    let _ = app_handle.emit("glowframe://set-paused", PausedPayload { paused: next });
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click { .. } = event {}
        })
        .build(app)?;

    Ok(())
}
