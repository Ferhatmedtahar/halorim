//! Start Halorim automatically when the user logs in (XDG autostart: GNOME, KDE, XFCE...). Linux only.
//!
//! How the login entry is owned depends on how Halorim was installed:
//!
//! * Package (.deb / .rpm): the package ships /etc/xdg/autostart/halorim.desktop, so uninstalling the
//!   package also removes the login entry. "Start at Login" off writes the standard per-user override
//!   ~/.config/autostart/halorim.desktop with `Hidden=true`; on removes that override.
//! * AppImage or a copied binary: there is no package, so Halorim writes the per-user entry itself.
//!   It carries `TryExec`, so once the file is deleted the session simply skips the entry.
//! * Development build (running from a cargo `target/` folder): never registered, so test builds can
//!   not start themselves at the next login.

use std::path::{Path, PathBuf};

const DESKTOP_FILE: &str = "halorim.desktop";
/// Name used by builds before the Halorim rename; always removed so the app never starts twice.
const OLD_DESKTOP_FILE: &str = "glowframe.desktop";
const OPT_OUT_FILE: &str = "autostart-disabled";
/// Installed by the .deb / .rpm (see tauri.conf.json bundle.linux).
const SYSTEM_ENTRY: &str = "/etc/xdg/autostart/halorim.desktop";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallKind {
    Package,
    Standalone,
    DevBuild,
}

/// A binary inside a cargo build folder (`.../target/release/...`, `.../target/debug/...`).
pub fn is_dev_build_path(exe: &Path) -> bool {
    let s = exe.to_string_lossy();
    s.contains("/target/release/") || s.contains("/target/debug/")
}

/// True when a user file in ~/.config/autostart only hides the system entry.
pub fn is_hidden_override(content: &str) -> bool {
    content.lines().any(|l| l.trim().eq_ignore_ascii_case("hidden=true"))
}

fn config_home() -> PathBuf {
    match std::env::var("XDG_CONFIG_HOME") {
        Ok(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".to_string())).join(".config"),
    }
}

fn user_entry_path() -> PathBuf {
    config_home().join("autostart").join(DESKTOP_FILE)
}

fn opt_out_path() -> PathBuf {
    config_home().join("glowframe").join(OPT_OUT_FILE)
}

/// The program to start at login. An AppImage runs from a temporary mount, so use the real file.
fn launch_path() -> Option<PathBuf> {
    if let Ok(appimage) = std::env::var("APPIMAGE") {
        if !appimage.is_empty() {
            return Some(PathBuf::from(appimage));
        }
    }
    std::env::current_exe().ok()
}

pub fn install_kind() -> InstallKind {
    if Path::new(SYSTEM_ENTRY).exists() {
        return InstallKind::Package;
    }
    match launch_path() {
        Some(p) if is_dev_build_path(&p) => InstallKind::DevBuild,
        _ => InstallKind::Standalone,
    }
}

/// Quotes a path for the Exec key of a .desktop file.
pub fn exec_quote(path: &Path) -> String {
    let s = path.to_string_lossy();
    if s.chars().all(|c| c.is_ascii_alphanumeric() || "/._-+".contains(c)) {
        return s.into_owned();
    }
    let escaped = s
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('`', "\\`")
        .replace('$', "\\$");
    format!("\"{}\"", escaped)
}

/// Per-user entry for AppImage / copied binaries. TryExec makes the session skip it once the file is gone.
pub fn desktop_entry(exe: &Path) -> String {
    format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=Halorim\n\
         Comment=Live interactive wallpaper\n\
         TryExec={}\n\
         Exec={}\n\
         Terminal=false\n\
         NoDisplay=true\n\
         X-GNOME-Autostart-enabled=true\n\
         X-GNOME-Autostart-Delay=2\n",
        exec_quote(exe),
        exec_quote(exe)
    )
}

/// Per-user override that switches the package's system entry off.
pub const HIDDEN_OVERRIDE: &str = "[Desktop Entry]\nType=Application\nName=Halorim\nHidden=true\n";

pub fn is_enabled() -> bool {
    let user = std::fs::read_to_string(user_entry_path()).ok();
    match install_kind() {
        InstallKind::Package => !user.as_deref().map(is_hidden_override).unwrap_or(false),
        InstallKind::Standalone => user.is_some_and(|u| !is_hidden_override(&u)),
        InstallKind::DevBuild => false,
    }
}

/// Called on every launch: removes stale entries and, for standalone copies, (re)writes the entry
/// unless the user turned autostart off.
pub fn ensure_default() {
    let autostart_dir = config_home().join("autostart");
    let _ = std::fs::remove_file(autostart_dir.join(OLD_DESKTOP_FILE));
    let user = std::fs::read_to_string(user_entry_path()).ok();
    match install_kind() {
        InstallKind::Package => {
            // An entry written by an older (pre-package) Halorim would shadow the system one.
            if user.as_deref().is_some_and(|u| !is_hidden_override(u)) {
                let _ = std::fs::remove_file(user_entry_path());
            }
        }
        InstallKind::Standalone => {
            if !opt_out_path().exists() {
                let _ = write_standalone_entry();
            }
        }
        InstallKind::DevBuild => {
            // Never register a build folder. Remove an entry a dev build made before this rule existed.
            if let (Some(u), Some(exe)) = (user.as_deref(), launch_path()) {
                if u.contains(&exec_quote(&exe)) {
                    let _ = std::fs::remove_file(user_entry_path());
                }
            }
        }
    }
}

fn write_standalone_entry() -> std::io::Result<()> {
    let exe = launch_path().ok_or_else(|| std::io::Error::other("no executable path"))?;
    write_user_entry(&desktop_entry(&exe))
}

fn write_user_entry(content: &str) -> std::io::Result<()> {
    let path = user_entry_path();
    if std::fs::read_to_string(&path).ok().as_deref() == Some(content) {
        return Ok(());
    }
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(path, content)
}

pub fn set_enabled(enabled: bool) {
    match install_kind() {
        InstallKind::Package => {
            if enabled {
                let _ = std::fs::remove_file(user_entry_path());
            } else {
                let _ = write_user_entry(HIDDEN_OVERRIDE);
            }
        }
        InstallKind::Standalone => {
            if enabled {
                let _ = std::fs::remove_file(opt_out_path());
                let _ = write_standalone_entry();
            } else {
                let _ = std::fs::remove_file(user_entry_path());
                if let Some(dir) = opt_out_path().parent() {
                    let _ = std::fs::create_dir_all(dir);
                }
                let _ = std::fs::write(opt_out_path(), "");
            }
        }
        InstallKind::DevBuild => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_paths_are_not_quoted() {
        assert_eq!(exec_quote(Path::new("/usr/bin/glowframe-desktop")), "/usr/bin/glowframe-desktop");
    }

    #[test]
    fn paths_with_spaces_and_specials_are_quoted() {
        assert_eq!(exec_quote(Path::new("/home/a b/glow")), "\"/home/a b/glow\"");
        assert_eq!(exec_quote(Path::new("/x/$y")), "\"/x/\\$y\"");
    }

    #[test]
    fn standalone_entry_points_at_binary_and_has_tryexec() {
        let e = desktop_entry(Path::new("/opt/halorim/Halorim.AppImage"));
        assert!(e.starts_with("[Desktop Entry]\n"));
        assert!(e.contains("\nExec=/opt/halorim/Halorim.AppImage\n"));
        assert!(e.contains("\nTryExec=/opt/halorim/Halorim.AppImage\n"));
    }

    #[test]
    fn detects_build_folders() {
        assert!(is_dev_build_path(Path::new("/home/u/walp/apps/desktop/src-tauri/target/release/glowframe-desktop")));
        assert!(is_dev_build_path(Path::new("/x/target/debug/glowframe-desktop")));
        assert!(!is_dev_build_path(Path::new("/usr/bin/glowframe-desktop")));
        assert!(!is_dev_build_path(Path::new("/home/u/Apps/Halorim.AppImage")));
    }

    #[test]
    fn recognises_hidden_override() {
        assert!(is_hidden_override(HIDDEN_OVERRIDE));
        assert!(!is_hidden_override(&desktop_entry(Path::new("/usr/bin/x"))));
    }
}
