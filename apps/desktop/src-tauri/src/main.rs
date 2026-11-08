#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Under Linux (X11 / Wayland via XWayland), force GDK to use X11
        // so global root window pointer queries and window layering hints function reliably.
        if std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }

    glowframe_desktop_lib::run();
}
