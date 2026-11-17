use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
struct CustomSvgPayload {
    /// Raw SVG text content read from disk
    svg: String,
}

#[derive(Clone, Serialize)]
struct ScenePayload {
    #[serde(rename = "presetId")]
    preset_id: String,
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
struct ColorsPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    background: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    fill: Option<String>,
}

/// (menu id suffix, label, CSS color). "default" = the preset's own color. "-" = separator.
/// Dark tones let the glow shine; light tones turn it into a soft colored halo.
const BACKGROUND_COLORS: &[(&str, &str, &str)] = &[
    ("black", "Black (Default)", "default"),
    ("midnight", "Midnight Navy", "#0b1222"),
    ("slate", "Slate", "#1b2430"),
    ("ocean", "Deep Ocean", "#06262d"),
    ("forest", "Forest Night", "#0e1f17"),
    ("wine", "Wine", "#2a0b14"),
    ("aubergine", "Aubergine", "#1e0f2a"),
    ("espresso", "Espresso", "#1e1511"),
    ("graphite", "Graphite", "#1c1d21"),
    ("-", "", ""),
    ("ivory", "Ivory", "#f4efe6"),
    ("sand", "Sand", "#e8dcc7"),
    ("sage", "Sage", "#dde5d8"),
    ("mist", "Mist Blue", "#e1e8f0"),
    ("blush", "Blush", "#f2e2df"),
    ("light-gray", "Light Gray", "#e6e8ec"),
    ("white", "White", "#ffffff"),
];
const OBJECT_COLORS: &[(&str, &str, &str)] = &[
    ("black", "Black (Default)", "default"),
    ("graphite", "Graphite", "#2a2c31"),
    ("navy", "Navy", "#101a33"),
    ("wine", "Deep Wine", "#3a0f1a"),
    ("forest", "Forest", "#0f2a1e"),
    ("-", "", ""),
    ("ivory", "Ivory", "#f4efe6"),
    ("white", "White", "#ffffff"),
];

#[derive(Clone, Serialize)]
struct SpeedPayload {
    speed: f64,
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Presets submenus (data-driven; ids match @glowframe/presets)
    const OS_PRESETS: &[(&str, &str)] = &[
        ("windows-11", "Windows 11"),
        ("windows-10", "Windows 10"),
        ("macos-apple", "macOS"),
    ];
    const DISTRO_PRESETS: &[(&str, &str)] = &[
        ("ubuntu", "Ubuntu"),
        ("tux-prism", "Tux (Linux)"),
        ("arch-prism", "Arch Linux"),
        ("kali", "Kali Linux"),
        ("debian-swirl", "Debian"),
        ("fedora", "Fedora"),
        ("linux-mint", "Linux Mint"),
        ("manjaro", "Manjaro"),
        ("opensuse", "openSUSE"),
        ("nixos", "NixOS"),
        ("pop-os", "Pop!_OS"),
        ("gentoo", "Gentoo"),
        ("red-hat", "Red Hat"),
        ("centos", "CentOS"),
        ("alpine", "Alpine Linux"),
        ("elementary", "elementary OS"),
        ("zorin", "Zorin OS"),
        ("void-linux", "Void Linux"),
        ("endeavouros", "EndeavourOS"),
        ("rocky-linux", "Rocky Linux"),
        ("parrot", "Parrot OS"),
        ("artix", "Artix Linux"),
    ];
    const SHAPE_PRESETS: &[(&str, &str)] = &[
        ("triangle-prism", "Triangle Prism"),
        ("infinity-loop", "Infinity Loop"),
        ("retro-ghost", "Phantom Arcade"),
    ];
    let build_submenu = |title: &str, list: &[(&str, &str)]| -> Result<Submenu<tauri::Wry>, Box<dyn std::error::Error>> {
        let items: Vec<MenuItem<tauri::Wry>> = list
            .iter()
            .map(|(id, label)| MenuItem::with_id(app, format!("preset:{}", id), *label, true, None::<&str>))
            .collect::<Result<_, _>>()?;
        let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
            items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
        Ok(Submenu::with_items(app, title, true, &refs)?)
    };
    let shapes_menu = build_submenu("Shapes", SHAPE_PRESETS)?;
    let build_color_menu = |title: &str, prefix: &str, list: &[(&str, &str, &str)]| -> Result<Submenu<tauri::Wry>, Box<dyn std::error::Error>> {
        let submenu = Submenu::new(app, title, true)?;
        for (id, label, _) in list {
            if *id == "-" {
                submenu.append(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
            } else {
                submenu.append(&MenuItem::with_id(app, format!("{}:{}", prefix, id), *label, true, None::<&str>)?)?;
            }
        }
        Ok(submenu)
    };
    let background_menu = build_color_menu("Background", "bg", BACKGROUND_COLORS)?;
    let object_menu = build_color_menu("Object Color", "fill", OBJECT_COLORS)?;
    let os_menu = build_submenu("Operating Systems", OS_PRESETS)?;
    let distro_menu = build_submenu("Linux Distros", DISTRO_PRESETS)?;

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

    // 4. Custom SVG
    let load_svg = MenuItem::with_id(app, "load_custom_svg", "Load Custom SVG…", true, None::<&str>)?;

    // 5. General Controls
    let toggle_pause = MenuItem::with_id(app, "toggle_pause", "Pause / Resume", true, None::<&str>)?;
    let autostart_item = tauri::menu::CheckMenuItem::with_id(
        app,
        "toggle_autostart",
        "Start at Login",
        true,
        crate::autostart::is_enabled(),
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Halorim", true, None::<&str>)?;

    let root_menu = Menu::with_items(
        app,
        &[
            &os_menu,
            &distro_menu,
            &shapes_menu,
            &background_menu,
            &object_menu,
            &glow_menu,
            &speed_menu,
            &fps_menu,
            &scale_menu,
            &load_svg,
            &toggle_pause,
            &autostart_item,
            &quit_item,
        ],
    )?;

    let is_paused = Arc::new(AtomicBool::new(false));

    let tray_icon = tauri::include_image!("icons/32x32.png");

    let tray_builder = TrayIconBuilder::with_id("glowframe-tray")
        .tooltip("Halorim")
        .icon(tray_icon)
        .menu(&root_menu)
        .show_menu_on_left_click(true);

    tray_builder
        .on_menu_event(move |app_handle, event| {
            let id = event.id.as_ref();
            match id {
                color if color.starts_with("bg:") || color.starts_with("fill:") => {
                    let (prefix, key) = color.split_once(':').unwrap_or(("", ""));
                    let list = if prefix == "bg" { BACKGROUND_COLORS } else { OBJECT_COLORS };
                    if let Some((_, _, css)) = list.iter().find(|(id, _, _)| *id == key) {
                        let value = Some(css.to_string());
                        let payload = if prefix == "bg" {
                            ColorsPayload { background: value, fill: None }
                        } else {
                            ColorsPayload { background: None, fill: value }
                        };
                        let _ = app_handle.emit("glowframe://set-colors", payload);
                    }
                }
                preset if preset.starts_with("preset:") => {
                    let _ = app_handle.emit(
                        "glowframe://set-scene",
                        ScenePayload { preset_id: preset["preset:".len()..].to_string() },
                    );
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
                "load_custom_svg" => {
                    // Spawn async task to open native file picker without blocking the UI thread
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let picked = rfd::AsyncFileDialog::new()
                            .set_title("Choose a Shape SVG File")
                            .add_filter("SVG Files", &["svg"])
                            .pick_file()
                            .await;
                        if let Some(file) = picked {
                            match std::fs::read_to_string(file.path()) {
                                Ok(svg_text) => {
                                    let _ = handle.emit(
                                        "glowframe://load-custom-svg",
                                        CustomSvgPayload { svg: svg_text },
                                    );
                                }
                                Err(e) => {
                                    eprintln!("[Glowframe] Failed to read SVG file: {}", e);
                                }
                            }
                        }
                    });
                }
                "toggle_autostart" => {
                    let enable = !crate::autostart::is_enabled();
                    crate::autostart::set_enabled(enable);
                    let _ = autostart_item.set_checked(crate::autostart::is_enabled());
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
