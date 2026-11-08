pub mod linux_host;
mod tray;
pub mod windows_host;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }

    let stop_signal = Arc::new(AtomicBool::new(false));
    let stop_signal_clone = stop_signal.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let handle = app.handle();
            let _ = tray::create_tray(handle);

            #[cfg(target_os = "linux")]
            {
                linux_host::sync_gnome_background();
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
                    .transparent(true)
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
