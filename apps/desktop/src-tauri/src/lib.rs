pub mod autostart;
pub mod background;
pub mod gnome_bridge;
pub mod linux_host;
mod tray;
pub mod windows_host;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

/// Receives a PNG snapshot of the live scene from a wallpaper webview (raw binary body) and
/// publishes it as the desktop background so the Super/Activities overview is not black.
#[tauri::command]
fn save_snapshot(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let monitor = request
        .headers()
        .get("monitor")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    if monitor != 0 {
        return Ok(()); // GNOME uses a single background image: monitor 0 is canonical.
    }
    if gnome_bridge::is_live() {
        // The Shell extension shows the live wallpaper everywhere (overview included). Writing a still
        // picture into the user's background settings would only risk leaving a frozen image behind
        // if Glowframe is killed (e.g. at shutdown).
        return Ok(());
    }
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => {
            background::publish_snapshot(bytes).map_err(|e| e.to_string())
        }
        _ => Err("expected raw PNG bytes".to_string()),
    }
}

/// Appends a line from a wallpaper webview to ~/.config/glowframe/glowframe.log.
#[tauri::command]
fn log_line(line: String) {
    use std::io::Write;
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let dir = std::path::PathBuf::from(home).join(".config").join("glowframe");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("glowframe.log");
    // Keep the log small: start over once it grows past 512 KB.
    if std::fs::metadata(&path).map(|m| m.len() > 512 * 1024).unwrap_or(false) {
        let _ = std::fs::remove_file(&path);
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "{}", line);
    }
}

pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }

    let stop_signal = Arc::new(AtomicBool::new(false));
    let stop_signal_clone = stop_signal.clone();

    let exit_stop_signal = stop_signal.clone();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_snapshot, log_line])
        .setup(move |app| {
            let handle = app.handle();
            autostart::ensure_default();
            let _ = tray::create_tray(handle);

            #[cfg(target_os = "linux")]
            {
                linux_host::sync_gnome_background();

                // Quit cleanly on SIGINT/SIGTERM so the original wallpaper is restored.
                for sig in [2, 15] {
                    let h = handle.clone();
                    glib::unix_signal_add(sig, move || {
                        h.exit(0);
                        glib::ControlFlow::Break
                    });
                }
            }

            let available_monitors = app.available_monitors().unwrap_or_default();
            let monitor_geometries: Vec<(i32, i32, u32, u32)> = if available_monitors.is_empty() {
                vec![(0, 0, 1920, 1080)]
            } else {
                available_monitors
                    .iter()
                    .map(|m| {
                        let pos = m.position();
                        let sz = m.size();
                        (pos.x, pos.y, sz.width, sz.height)
                    })
                    .collect()
            };

            let mut monitor_bounds = Vec::new();

            for (i, &(pos_x, pos_y, width, height)) in monitor_geometries.iter().enumerate() {
                let label = format!("wallpaper-{}", i);
                let url = tauri::WebviewUrl::App(format!("index.html?monitor={}", i).into());

                let win_res = tauri::WebviewWindowBuilder::new(app, &label, url)
                    .title(format!("Glowframe Wallpaper {}", i))
                    .decorations(false)
                    .transparent(false)
                    .always_on_bottom(true)
                    .skip_taskbar(true)
                    .resizable(false)
                    .position(pos_x as f64, pos_y as f64)
                    .inner_size(width as f64, height as f64)
                    .build();

                match win_res {
                    Ok(win) => {
                        monitor_bounds.push(linux_host::MonitorBounds {
                            index: i,
                            x: pos_x,
                            y: pos_y,
                            width: width as i32,
                            height: height as i32,
                        });

                        #[cfg(target_os = "windows")]
                        {
                            if let Ok(hwnd) = win.hwnd() {
                                windows_host::attach_to_desktop(hwnd.0 as isize);
                            }
                        }

                        #[cfg(target_os = "linux")]
                        {
                            linux_host::configure_linux_window(
                                &win,
                                pos_x,
                                pos_y,
                                width as i32,
                                height as i32,
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!("[Glowframe] Failed to create window for monitor {}: {:?}", i, e);
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                windows_host::start_desktop_monitor(handle.clone(), stop_signal_clone);
            }

            #[cfg(target_os = "linux")]
            {
                linux_host::start_desktop_monitor(handle.clone(), stop_signal_clone, monitor_bounds);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app, event| {
            if let tauri::RunEvent::Exit = event {
                exit_stop_signal.store(true, std::sync::atomic::Ordering::Relaxed);
                background::restore_original();
            }
        });
}
