mod tray;
pub mod windows_host;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    let stop_signal = Arc::new(AtomicBool::new(false));
    let stop_signal_clone = stop_signal.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let handle = app.handle();
            let _ = tray::create_tray(handle);

            // On Windows, attach the main window to the WorkerW desktop background layer
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        windows_host::attach_to_desktop(hwnd.0 as isize);
                    }
                }
            }

            // Start global cursor tracking, click hook, and fullscreen monitor
            windows_host::start_desktop_monitor(handle.clone(), stop_signal_clone);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
