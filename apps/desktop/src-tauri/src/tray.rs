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

#[derive(Clone, Serialize)]
struct GlowPayload {
    intensity: f64,
}

#[derive(Clone, Serialize)]
struct SpeedPayload {
    speed: f64,
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Presets Submenu
    let preset_triangle = MenuItem::with_id(app, "preset_triangle", "Triangle Prism", true, None::<&str>)?;
    let preset_tux = MenuItem::with_id(app, "preset_tux", "Tux Linux Mascot", true, None::<&str>)?;
    let preset_arch = MenuItem::with_id(app, "preset_arch", "Arch Linux Apex", true, None::<&str>)?;
    let preset_debian = MenuItem::with_id(app, "preset_debian", "Debian Swirl", true, None::<&str>)?;
    let preset_infinity = MenuItem::with_id(app, "preset_infinity", "Infinity Loop", true, None::<&str>)?;
    let preset_diamond = MenuItem::with_id(app, "preset_diamond", "Diamond Facet", true, None::<&str>)?;
    let preset_hypercube = MenuItem::with_id(app, "preset_hypercube", "Tesseract Hypercube", true, None::<&str>)?;
    let preset_phantom = MenuItem::with_id(app, "preset_phantom", "Phantom Arcade", true, None::<&str>)?;
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
            &preset_arch,
            &preset_debian,
            &preset_infinity,
            &preset_diamond,
            &preset_hypercube,
            &preset_phantom,
            &preset_fourpane,
            &preset_hexagon,
            &preset_cyber,
            &preset_matrix,
        ],
    )?;

    // 2. Glow Intensity Submenu
    let glow_subtle = MenuItem::with_id(app, "glow_subtle", "Subtle Glow (0.75x)", true, None::<&str>)?;
    let glow_balanced = MenuItem::with_id(app, "glow_balanced", "Balanced Glow (1.15x)", true, None::<&str>)?;
    let glow_radiance = MenuItem::with_id(app, "glow_radiance", "High Radiance (1.8x)", true, None::<&str>)?;
    let glow_maximum = MenuItem::with_id(app, "glow_maximum", "Maximum Aura (2.5x)", true, None::<&str>)?;

    let glow_menu = Submenu::with_items(
        app,
        "Glow Intensity",
        true,
        &[&glow_subtle, &glow_balanced, &glow_radiance, &glow_maximum],
    )?;

    // 3. Rotation Speed Submenu
    let speed_static = MenuItem::with_id(app, "speed_static", "Static (0x)", true, None::<&str>)?;
    let speed_slow = MenuItem::with_id(app, "speed_slow", "Slow Spin (0.02x)", true, None::<&str>)?;
    let speed_normal = MenuItem::with_id(app, "speed_normal", "Normal Spin (0.05x)", true, None::<&str>)?;
    let speed_fast = MenuItem::with_id(app, "speed_fast", "Fast Pulse (0.12x)", true, None::<&str>)?;

    let speed_menu = Submenu::with_items(
        app,
        "Rotation Speed",
        true,
        &[&speed_static, &speed_slow, &speed_normal, &speed_fast],
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
            &glow_menu,
            &speed_menu,
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
                "preset_arch" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "arch-prism" });
                }
                "preset_debian" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "debian-swirl" });
                }
                "preset_infinity" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "infinity-loop" });
                }
                "preset_diamond" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "diamond-prism" });
                }
                "preset_hypercube" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "hypercube" });
                }
                "preset_phantom" => {
                    let _ = app_handle.emit("glowframe://set-scene", ScenePayload { preset_id: "retro-ghost" });
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
                "glow_subtle" => {
                    let _ = app_handle.emit("glowframe://set-glow-intensity", GlowPayload { intensity: 0.75 });
                }
                "glow_balanced" => {
                    let _ = app_handle.emit("glowframe://set-glow-intensity", GlowPayload { intensity: 1.15 });
                }
                "glow_radiance" => {
                    let _ = app_handle.emit("glowframe://set-glow-intensity", GlowPayload { intensity: 1.8 });
                }
                "glow_maximum" => {
                    let _ = app_handle.emit("glowframe://set-glow-intensity", GlowPayload { intensity: 2.5 });
                }
                "speed_static" => {
                    let _ = app_handle.emit("glowframe://set-rotation-speed", SpeedPayload { speed: 0.0 });
                }
                "speed_slow" => {
                    let _ = app_handle.emit("glowframe://set-rotation-speed", SpeedPayload { speed: 0.02 });
                }
                "speed_normal" => {
                    let _ = app_handle.emit("glowframe://set-rotation-speed", SpeedPayload { speed: 0.05 });
                }
                "speed_fast" => {
                    let _ = app_handle.emit("glowframe://set-rotation-speed", SpeedPayload { speed: 0.12 });
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
