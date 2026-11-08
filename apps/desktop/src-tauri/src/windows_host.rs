use serde::Serialize;
use std::sync::atomic::AtomicBool;
#[cfg(target_os = "windows")]
use std::sync::atomic::Ordering;
use std::sync::Arc;
#[cfg(target_os = "windows")]
use std::thread;
#[cfg(target_os = "windows")]
use std::time::Duration;
use tauri::AppHandle;
#[cfg(target_os = "windows")]
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct CursorPayload {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Serialize)]
pub struct PausedPayload {
    pub paused: bool,
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

#[cfg(target_os = "windows")]
mod win32 {
    use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, POINT, RECT};
    use windows_sys::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTOPRIMARY,
    };
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowExW, FindWindowW, GetCursorPos, GetForegroundWindow,
        GetSystemMetrics, GetWindowLongW, GetWindowRect, SendMessageTimeoutW, SetParent,
        SetWindowLongW, SetWindowPos, GWL_STYLE, HWND_BOTTOM, SM_CXSCREEN, SM_CYSCREEN,
        SMTO_NORMAL, SWP_NOACTIVATE, SWP_SHOWWINDOW, WS_CHILD, WS_CLIPSIBLINGS, WS_VISIBLE,
    };

    struct EnumData {
        workerw: HWND,
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam as *mut EnumData);
        let def_view = FindWindowExW(
            hwnd,
            std::ptr::null_mut(),
            wide_str("SHELLDLL_DefView").as_ptr(),
            std::ptr::null(),
        );

        if !def_view.is_null() {
            let next_workerw = FindWindowExW(
                std::ptr::null_mut(),
                hwnd,
                wide_str("WorkerW").as_ptr(),
                std::ptr::null(),
            );
            if !next_workerw.is_null() {
                data.workerw = next_workerw;
            }
        }
        1
    }

    fn wide_str(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn find_desktop_workerw() -> Option<HWND> {
        unsafe {
            let progman = FindWindowW(wide_str("Progman").as_ptr(), std::ptr::null());
            if progman.is_null() {
                return None;
            }

            let mut result: usize = 0;
            // Message 0x052C tells Progman to spawn a WorkerW window behind icons
            SendMessageTimeoutW(
                progman,
                0x052C,
                0,
                0,
                SMTO_NORMAL,
                1000,
                &mut result as *mut usize as _,
            );

            let mut data = EnumData {
                workerw: std::ptr::null_mut(),
            };
            EnumWindows(Some(enum_windows_callback), &mut data as *mut EnumData as _);

            if !data.workerw.is_null() {
                Some(data.workerw)
            } else {
                Some(progman)
            }
        }
    }

    pub fn parent_to_desktop(hwnd: HWND) -> bool {
        unsafe {
            if let Some(workerw) = find_desktop_workerw() {
                let current_style = GetWindowLongW(hwnd, GWL_STYLE);
                let new_style = (current_style | WS_CHILD as i32 | WS_VISIBLE as i32 | WS_CLIPSIBLINGS as i32)
                    & !(0x00C00000); // Remove WS_CAPTION
                SetWindowLongW(hwnd, GWL_STYLE, new_style);

                SetParent(hwnd, workerw);

                let screen_w = GetSystemMetrics(SM_CXSCREEN);
                let screen_h = GetSystemMetrics(SM_CYSCREEN);

                SetWindowPos(
                    hwnd,
                    HWND_BOTTOM,
                    0,
                    0,
                    screen_w,
                    screen_h,
                    SWP_SHOWWINDOW | SWP_NOACTIVATE,
                );
                true
            } else {
                false
            }
        }
    }

    pub fn poll_global_cursor() -> Option<(f64, f64, bool)> {
        unsafe {
            let mut pt = POINT { x: 0, y: 0 };
            if GetCursorPos(&mut pt) == 0 {
                return None;
            }

            let screen_w = GetSystemMetrics(SM_CXSCREEN);
            let screen_h = GetSystemMetrics(SM_CYSCREEN);

            if screen_w <= 0 || screen_h <= 0 {
                return None;
            }

            let (norm_x, norm_y) = super::normalize_coordinates(pt.x, pt.y, screen_w, screen_h);

            // Check if left mouse button is pressed (high bit set = pressed)
            let is_down = (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0;

            Some((norm_x, norm_y, is_down))
        }
    }

    pub fn is_fullscreen_app_active() -> bool {
        unsafe {
            let foreground = GetForegroundWindow();
            if foreground.is_null() {
                return false;
            }

            // Exclude desktop / shell windows from triggering fullscreen pause
            let progman = FindWindowW(wide_str("Progman").as_ptr(), std::ptr::null());
            if foreground == progman {
                return false;
            }

            let mut app_rect = RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            };
            if GetWindowRect(foreground, &mut app_rect) == 0 {
                return false;
            }

            let monitor = MonitorFromWindow(foreground, MONITOR_DEFAULTTOPRIMARY);
            let mut mi: MONITORINFO = std::mem::zeroed();
            mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;

            if GetMonitorInfoW(monitor, &mut mi) == 0 {
                return false;
            }

            let is_covering_screen = app_rect.left <= mi.rcMonitor.left
                && app_rect.top <= mi.rcMonitor.top
                && app_rect.right >= mi.rcMonitor.right
                && app_rect.bottom >= mi.rcMonitor.bottom;

            // Also check battery saver status
            let mut power_status: SYSTEM_POWER_STATUS = std::mem::zeroed();
            let is_battery_saver = if GetSystemPowerStatus(&mut power_status) != 0 {
                power_status.SystemStatusFlag == 1
            } else {
                false
            };

            is_covering_screen || is_battery_saver
        }
    }
}

pub fn start_desktop_monitor(app: AppHandle, stop_signal: Arc<AtomicBool>) {
    #[cfg(target_os = "windows")]
    {
        let app_handle = app.clone();

        thread::spawn(move || {
            let mut last_x = -1.0;
            let mut last_y = -1.0;
            let mut was_down = false;
            let mut was_paused = false;
            let mut check_counter = 0;

            while !stop_signal.load(Ordering::Relaxed) {
                if let Some((x, y, is_down)) = win32::poll_global_cursor() {
                    if (x - last_x).abs() > 0.0005 || (y - last_y).abs() > 0.0005 {
                        let _ = app_handle.emit("glowframe://cursor-move", CursorPayload { x, y });
                        last_x = x;
                        last_y = y;
                    }

                    if is_down && !was_down {
                        let _ = app_handle.emit("glowframe://cursor-down", CursorPayload { x, y });
                    }
                    was_down = is_down;
                }

                check_counter += 1;
                if check_counter >= 15 {
                    check_counter = 0;
                    let should_pause = win32::is_fullscreen_app_active();
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

                thread::sleep(Duration::from_millis(16));
            }
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, stop_signal);
    }
}

pub fn attach_to_desktop(_hwnd_ptr: isize) -> bool {
    #[cfg(target_os = "windows")]
    {
        win32::parent_to_desktop(_hwnd_ptr as _)
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_coordinates() {
        assert_eq!(normalize_coordinates(0, 0, 1920, 1080), (0.0, 0.0));
        assert_eq!(normalize_coordinates(960, 540, 1920, 1080), (0.5, 0.5));
        assert_eq!(normalize_coordinates(1920, 1080, 1920, 1080), (1.0, 1.0));
        assert_eq!(normalize_coordinates(-50, -50, 1920, 1080), (0.0, 0.0));
        assert_eq!(normalize_coordinates(2500, 1500, 1920, 1080), (1.0, 1.0));
        assert_eq!(normalize_coordinates(100, 100, 0, 0), (0.0, 0.0));
    }

    #[test]
    fn test_cursor_payload_serialization() {
        let payload = CursorPayload { x: 0.25, y: 0.75 };
        let json = serde_json::to_string(&payload).unwrap();
        assert_eq!(json, "{\"x\":0.25,\"y\":0.75}");
    }

    #[test]
    fn test_paused_payload_serialization() {
        let payload = PausedPayload { paused: true };
        let json = serde_json::to_string(&payload).unwrap();
        assert_eq!(json, "{\"paused\":true}");
    }
}

